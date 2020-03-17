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
  const gateways = {};
  const gatewayDeployment = {};
  const invokers = {};

  const cfRoutes = _.map(routes, (flowAction, route) => {
    const [method, rawGateway] = route.split(' ');
    const gateway = _.camelCase(rawGateway.replace(/\//g, ' ').toUpperCase().replace(/:/g, ' '));
    const lambda = _.camelCase(flowAction.replace(/\//g, ' ').toUpperCase().replace(/_/g, ' '));
    gateways[`${gateway}Gateway`] = {
      Type: "AWS::ApiGateway::RestApi",
      Properties: {
          Name: gateway,
      }
    };

    return {
      name: `${lambda}Route`,
      Type: "AWS::ApiGateway::Method",
      Properties: {
        AuthorizationType: "NONE",
        HttpMethod: method.toUpperCase(),
        Integration: {
          IntegrationHttpMethod: method.toUpperCase(),
          Type: "AWS_PROXY",
          Uri: {
            'Fn::Sub': [
              "arn:aws:apigateway:${AWS::Region}:lambda:path/2015-03-31/functions/${lambdaArn}/invocations",
              {
                lambdaArn: {
                  'Fn::GetAtt': [
                    lambda,
                    "Arn"
                  ]
                }
              }
            ]
          }
        },
        ResourceId: {
          'Fn::GetAtt': [
            `${gateway}Gateway`,
            "RootResourceId"
          ]
        },
        RestApiId: {
          Ref: `${gateway}Gateway`
        }
      }
    }
  });

  _.forEach(routes, (flowAction, route) => {
    const [method, rawGateway] = route.split(' ');
    const gateway = _.camelCase(rawGateway.replace(/\//g, ' ').toUpperCase().replace(/:/g, ' '));
    const lambda = _.camelCase(flowAction.replace(/\//g, ' ').toUpperCase().replace(/_/g, ' '));

    gatewayDeployment[`${gateway}GatewayDeployment`] = {
      Type: 'AWS::ApiGateway::Deployment',
      DependsOn: [
          ..._.map(cfRoutes, 'name')
      ],
      Properties: {
          RestApiId: {
              Ref: `${gateway}Gateway`
          },
          StageName: 'app'
      }
    }

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
              'Fn::Sub': 'arn:aws:execute-api:${AWS::Region}:${AWS::AccountId}:${' + gateway + 'Gateway}/*/' + method.toUpperCase() + '/'
          }
      }
    }
  });

  return {
    ...data, 
    routes: _(cfRoutes).toPlainObject().mapKeys(r => r.name).mapValues(r => _.omit(r, 'name')).value(),
    gateways,
    gatewayDeployment,
    invokers
  };
}

function createCloudFormation({resources, routes, gateways, gatewayDeployment, invokers}) {
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
        ...gatewayDeployment,
        ...invokers,
        ...gateways,
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

  return {cloudFormation};
}

function deployCF(data) {
  var cloudformation = new aws.CloudFormation();
  var params = {
    StackName: 'STRING_VALUE', /* required */
    Capabilities: [
      CAPABILITY_IAM | CAPABILITY_NAMED_IAM | CAPABILITY_AUTO_EXPAND,
      /* more items */
    ],
    ClientRequestToken: 'STRING_VALUE',
    DisableRollback: true || false,
    EnableTerminationProtection: true || false,
    NotificationARNs: [
      'STRING_VALUE',
      /* more items */
    ],
    OnFailure: DO_NOTHING | ROLLBACK | DELETE,
    Parameters: [
      {
        ParameterKey: 'STRING_VALUE',
        ParameterValue: 'STRING_VALUE',
        ResolvedValue: 'STRING_VALUE',
        UsePreviousValue: true || false
      },
      /* more items */
    ],
    ResourceTypes: [
      'STRING_VALUE',
      /* more items */
    ],
    RoleARN: 'STRING_VALUE',
    RollbackConfiguration: {
      MonitoringTimeInMinutes: 'NUMBER_VALUE',
      RollbackTriggers: [
        {
          Arn: 'STRING_VALUE', /* required */
          Type: 'STRING_VALUE' /* required */
        },
        /* more items */
      ]
    },
    StackPolicyBody: 'STRING_VALUE',
    StackPolicyURL: 'STRING_VALUE',
    Tags: [
      {
        Key: 'STRING_VALUE', /* required */
        Value: 'STRING_VALUE' /* required */
      },
      /* more items */
    ],
    TemplateBody: 'STRING_VALUE',
    TemplateURL: 'STRING_VALUE',
    TimeoutInMinutes: 'NUMBER_VALUE'
  };
  cloudformation.createStack(params, function(err, data) {
    if (err) console.log(err, err.stack); // an error occurred
    else     console.log(data);           // successful response
  });
}

module.exports = [
  getFlowsFilesPath,
  cloudFormationS3,
  uploadS3BuildCloudFormation,
  checkHttpRoutes,
  createCloudFormation
];