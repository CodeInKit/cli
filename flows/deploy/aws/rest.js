const Promise = require('bluebird');
const fs = require('fs');
const path = require('path');
const aws = require('aws-sdk');
const _ = require('lodash');

async function getTemplate() {
  const project = process.cwd();
  const package = require(`${project}/package.json`);
  const cloudformation = new aws.CloudFormation({region: process.env.AWS_REGION || 'us-east-1'});

  const template = await (new Promise(resolve => {
    cloudformation.getTemplate({StackName:package.name}, (err, data) => {
      resolve(data);
    });
  }));
  return {template: JSON.parse(template.TemplateBody), package};
  
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
          `${_.camelCase(data.package.name)}Gateway`,
          'RootResourceId'
        ]
      };
      
      resources[`${_.camelCase(resourceName.replace(/:/g, ' '))}Route`] = {
        Type: 'AWS::ApiGateway::Resource',
        Properties: {
          RestApiId: {
            Ref: `${_.camelCase(data.package.name)}Gateway`
          },
          ParentId: parent,
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
          IntegrationHttpMethod: 'POST',
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
          },
          PassthroughBehavior: 'WHEN_NO_MATCH',
          IntegrationResponses: [{
            StatusCode: 200
          }]
        },
        MethodResponses: [{
          StatusCode: 200,
          ResponseModels: {}
        }],
        ResourceId: {
          Ref: `${gateway}Route`
        },
        RestApiId: {
          Ref: `${_.camelCase(data.package.name)}Gateway`
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


    invokers[`${method.toUpperCase()}${gateway}ApiGatewayInvoke`] = {
      Type: 'AWS::Lambda::Permission',
      Properties: {
          Action: 'lambda:InvokeFunction',
          FunctionName: { 'Ref': lambda },
          Principal: 'apigateway.amazonaws.com',
          SourceArn: {
            'Fn::Sub': ['arn:aws:execute-api:${AWS::Region}:${AWS::AccountId}:${' + _.camelCase(data.package.name) + 'Gateway}/*/*/${path}', {
              method: method.toUpperCase(),
              path: routeFixed.substring(1),
              stage: 'production'
            }]
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


function buildCF({routes, invokers, routesResources, template, package}) {
  const cloudFormation = {    
    AWSTemplateFormatVersion: '2010-09-09',
      Resources: {
        ...template.Resources,
        [`${_.camelCase(package.name)}Gateway`]: {
          Type: 'AWS::ApiGateway::RestApi',
          Properties: {
            Name: `${_.camelCase(package.name)}Gateway`
          }
        },
        [`${_.camelCase(package.name)}GatewayDeployment`]: {
          Type: 'AWS::ApiGateway::Deployment',
          DependsOn: [
            ..._.keys(routes)
          ],
          Properties: {
            RestApiId: {
              Ref: `${_.camelCase(package.name)}Gateway`
            },
            StageName: 'production'
          }
        },
        ...routesResources,
        ...invokers,
        ...routes,
      }
    };

  console.log('*******************');
  console.log(JSON.stringify(cloudFormation));
  console.log('*******************');

  return {template: JSON.stringify(cloudFormation), package};  
}

async function deployCF({template, package}) {
  var cloudformation = new aws.CloudFormation({region: process.env.AWS_REGION || 'us-east-1'});
  var params = {
    StackName: package.name,
    Capabilities: [
      'CAPABILITY_IAM',
    ],
    TemplateBody: template
  };

  return new Promise((resolve, reject) => {
    cloudformation.updateStack(params, (err, data) => {
      if (err) reject(err);
      else     resolve(data);
    });
  })

}

module.exports = [getTemplate, checkHttpRoutes, buildCF, deployCF];