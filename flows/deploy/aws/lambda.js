const { Flows } = require('@codeinkit/flows');
const Promise = require('bluebird');
const awsSingleDeploy = require('./aws_single');
const fs = require('fs');
const path = require('path');
const aws = require('aws-sdk');
const _ = require('lodash');

const flows = new Flows();
flows.register('single_deploy', awsSingleDeploy);

async function getFlowsFilesPath() {
  const flowsFiles = [];
  const project = process.cwd();
  const package = require(`${project}/package.json`);

  async function getFolder(folderPath) {
    const files = await fs.readdirAsync(folderPath);
    
    await Promise.each(files, async file => {
      const fullFilePath = path.join(folderPath, file);
      const stats = await fs.statAsync(fullFilePath);

      if(file[0] === '.') {
        return;
      }

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
  const s3 = new aws.S3({region: process.env.AWS_REGION || 'us-east-1'});
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

  const resources = await Promise.mapSeries(flowsFiles, path => flows.execute('single_deploy', {
    path,
    project,
    projectName: package.name,
    version: package.version
  }));

  return {
    package,
    resources
  }
}

function createCloudFormation({package, resources}) {
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
        lambdaLogGroup: {
          Type: "AWS::Logs::LogGroup",
          Properties: {
            LogGroupName: {
              'Fn::Sub': "/aws/lambda/appLog"
            },
            RetentionInDays: 90
          }
        },
        ..._.omit(_.reduce(resources, (acc, resource) => ({
          ...acc,
          ...resource
        }), {}), '__flows')
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
    OnFailure: 'DELETE',
    TemplateBody: template
  };

  const stacks = await (new Promise(resolve => {
    cloudformation.describeStacks((err, data) => {
      resolve(data);
    });
  }));
  
  if(stacks && stacks.Stacks) {
    const stack = _.find(stacks.Stacks, s => s.StackName === package.name);

    if(stack) {
      return new Promise((resolve, reject) => {
        cloudformation.updateStack(_.omit(params, 'OnFailure'), (err, data) => {
          if (err) reject(err);
          else     resolve(data);
        });
      })
    }

  }

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
  createCloudFormation,
  deployCF
];