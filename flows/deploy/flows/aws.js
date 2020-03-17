const { Flows } = require('@codeinkit/flows');
const Promise = require('bluebird');
const awsSingleDeploy = require('./aws_single');
const fs = require('fs');
const path = require('path');
const aws = require('aws-sdk');
const _ = require('lodash');

const flows = new Flows();
flows.register('single.deploy', awsSingleDeploy);

async function getFlowsFilesPath() {
  const flowsFiles = [];
  const project = process.cwd();
  const package = require(`${project}/package.json`);

  async function getFolder(folderPath) {
    const files = await fs.readdirAsync(folderPath);
    
    await Promise.each(files, async file => {
      const fullFilePath = path.join(folderPath, file);
      const stats = await fs.statAsync(fullFilePath);
      
      if(stats.isDirectory()) {
        await getFolder(fullFilePath);
      } else {
        flowsFiles.push(fullFilePath);
      }
    });
  }

  await getFolder(project + '/flows/');

  return { package, project, flowsFiles }
}

async function cloudFormationS3(data) {
  const s3 = new aws.S3();
  const createBucket = (name) => new Promise((resolve, reject) => {
    s3.createBucket({Bucket: name}, (err, info) => {
      if(err) {
        return reject(err);
      }

      resolve(info);
    });
  });

  await createBucket(`flows-framework.${data.package.name}`).catch(e => console.error(e.message));

  return data;
}

async function uploadS3BuildCloudFormation({ package, project, flowsFiles }) {

  const resources = await Promise.mapSeries(flowsFiles, path => flows.execute('single.deploy', {
    path,
    project,
    projectName: package.name,
    version: package.version
  }));

  return {
    resources
  }
}

async function checkHttpRoutes(data) {
  const routes = require(path.resolve(process.cwd(), 'routes/rest.js'));
  const invokers = {};
  const resources = {};

  const cfRoutes = _.map(routes, (flowAction, route) => {
    const [method, rawGateway] = route.split(' ');
    const gateway = _.camelCase(rawGateway.replace(/\//g, ' ').toUpperCase().replace(/:/g, ' '));
    const lambda = _.camelCase(flowAction.replace(/\//g, ' ').toUpperCase().replace(/_/g, ' '));

    const pathResources = rawGateway.split('/');
    for (let i = 1; i < pathResources.length; i++) {
      const pathResource = pathResources[i];
      const resourceName = _.reduce(pathResources, (a, p, j) => j <= i ? a + ' ' + p : a, '');
      const prevResourceName = _.reduce(pathResources, (a, p, j) => j <= i-1 ? a + ' ' + p : a, '');
      const parent = i > 1 ? {
        Ref: `${_.camelCase(prevResourceName.replace(/:/g, ' '))}Route`
      } : {
        'Fn::GetAtt': [
          'appGateway',
          'RootResourceId'
        ]
      };
      
      resources[`${_.camelCase(resourceName.replace(/:/g, ' '))}Route`] = {
        Type: 'AWS::ApiGateway::Resource',
        Properties: {
          RestApiId: {
            Ref: 'appGateway'
          },
          ParentId: parent,
          // Path: rawGateway.replace(/\/\:(.+?)(\/|$)/g, '/{$1}/')
          PathPart: pathResource.replace(/\:(.+?)$/g, '{$1}')
        }
      };
        
    }

    return {
      name: `${lambda}Method`,
      Type: 'AWS::ApiGateway::Method',
      Properties: {
        AuthorizationType: 'NONE',
        HttpMethod: method.toUpperCase(),
        Integration: {
          IntegrationHttpMethod: method.toUpperCase(),
          Type: 'AWS_PROXY',
          Uri: {
            'Fn::Sub': [
              'arn:aws:apigateway:${AWS::Region}:lambda:path/2015-03-31/functions/${lambdaArn}/invocations',
              {
                lambdaArn: {
                  'Fn::GetAtt': [
                    lambda,
                    'Arn'
                  ]
                }
              }
            ]
          }
        },
        ResourceId: {
          Ref: `${gateway}Route`
        },
        RestApiId: {
          Ref: `appGateway`
        }
      }
    }
  });

  _.forEach(routes, (flowAction, route) => {
    const [method, rawGateway] = route.split(' ');
    const gateway = _.camelCase(rawGateway.replace(/\//g, ' ').toUpperCase().replace(/:/g, ' '));
    const lambda = _.camelCase(flowAction.replace(/\//g, ' ').toUpperCase().replace(/_/g, ' '));
    let routeFixed = rawGateway.replace(/\/\:(.+?)($|\/)/g, '/{$1}/');
    
    routeFixed = routeFixed.lastIndexOf('/') === routeFixed.length-1 ?
      routeFixed.substring(0, routeFixed.length-1) : routeFixed;


    invokers[`${gateway}ApiGatewayInvoke`] = {
      Type: 'AWS::Lambda::Permission',
      Properties: {
          Action: 'lambda:InvokeFunction',
          FunctionName: {
              'Fn::GetAtt': [
                lambda,
                  'Arn'
              ]
          },
          Principal: 'apigateway.amazonaws.com',
          SourceArn: {
              'Fn::Sub': 'arn:aws:execute-api:${AWS::Region}:${AWS::AccountId}:${appGateway}/*/' + method.toUpperCase() + routeFixed
          }
      }
    }
  });

  return {
    ...data, 
    routes: _(cfRoutes).toPlainObject().mapKeys(r => r.name).mapValues(r => _.omit(r, 'name')).value(),
    invokers,
    routesResources: resources
  };
}

function createCloudFormation({resources, routes, invokers, routesResources}) {
  const cloudFormation = {
    AWSTemplateFormatVersion: '2010-09-09',
      Resources: {
        lambdaIAMRole: {
          Type: 'AWS::IAM::Role',
          Properties: {
            AssumeRolePolicyDocument: {
              Version: '2012-10-17',
              Statement: [{
                Action: [
                  'sts:AssumeRole'
                ],
                Effect: 'Allow',
                Principal: {
                  Service: [
                    'lambda.amazonaws.com'
                  ]
                }
              }]
            },
            Policies: [{
              PolicyDocument: {
                Version: '2012-10-17',
                Statement: [{
                  Action: [
                    'logs:CreateLogGroup',
                    'logs:CreateLogStream',
                    'logs:PutLogEvents'
                  ],
                  Effect: 'Allow',
                  Resource: [{
                    'Fn::Sub': 'arn:aws:logs:${AWS::Region}:${AWS::AccountId}:log-group:/aws/lambda/*'
                  }]
                }]
              },
              PolicyName: 'lambda'
            }]
          }
        },
          appGateway: {
            Type: 'AWS::ApiGateway::RestApi',
            Properties: {
              Name: 'appGateway'
            }
          },
          lambdaLogGroup: {
            Type: "AWS::Logs::LogGroup",
            Properties: {
                LogGroupName: {
                    'Fn::Sub': "/aws/lambda/appLog"
                },
                RetentionInDays: 90
              }
            },
          appGatewayDeployment: {
            Type: 'AWS::ApiGateway::Deployment',
            DependsOn: [
                ..._.keys(routes)
            ],
            Properties: {
                RestApiId: {
                    Ref: `appGateway`
                },
                StageName: 'app'
          }},
        ...routesResources,
        ...invokers,
        ...routes,
        ..._.omit(_.reduce(resources, (acc, resource) => ({
          ...acc,
          ...resource
        }), {}), '__flows')
      }
  };

  console.log('*******************');
  console.log(JSON.stringify(cloudFormation));
  console.log('*******************');

  return {template: JSON.stringify(cloudFormation)};
}

function deployCF({template}) {
  var cloudformation = new aws.CloudFormation();
  var params = {
    StackName: 'app',
    Capabilities: [
      'CAPABILITY_IAM',
    ],
    OnFailure: 'DELETE',
    TemplateBody: template
  };

  return new Promise((resolve, reject) => {
    cloudformation.createStack(params, function(err, data) {
      if (err) reject(err);
      else     resolve(data);
    });
  })
}

module.exports = [
  getFlowsFilesPath,
  cloudFormationS3,
  uploadS3BuildCloudFormation,
  checkHttpRoutes,
  createCloudFormation,
  deployCF
];