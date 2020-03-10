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

  await createBucket(`flows-framework.${data.package.name}`).catch(console.error);

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

function createCloudFormation({resources}) {
  const cloudFormation = {
    AWSTemplateFormatVersion: '2010-09-09',
    Resources:
      _.omit(_.reduce(resources, (acc, resource) => ({...acc, ...resource}), {}), '__flows')
  };

  console.log('*******************');
  console.log(JSON.stringify(cloudFormation));
  console.log('*******************');
  

  return {};
}

module.exports = [
  getFlowsFilesPath,
  cloudFormationS3,
  uploadS3BuildCloudFormation,
  createCloudFormation
];