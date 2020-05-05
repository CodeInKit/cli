const _ = require('lodash');
const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs'));
const path = require('path');
const acorn = require('acorn');
const walk = require('acorn-walk');
const aws = require('aws-sdk');
const child_process = require('child_process');
const archiver = require('archiver');

/**
 * 
 * @param {object} data 
 * @param {string} data.path 
 * @param {string} data.project
 * @param {string} data.projectName
 * @param {string} data.version
 */
async function getRequireFiles(data) {

  async function getRequires(reqPath) {    
    const file = await fs.readFileAsync(reqPath, 'utf-8');
    const tree = acorn.parse(file);
    const requires = new Set();

    walk.full(tree, node => {
      if(node.type === 'CallExpression' && node.callee.name === 'require') {
        requires.add(node.arguments[0].value);
      }
    });

    await Promise.each(Array.from(requires), async (req, index) => {      
      if(req[0] === '.' || req[0] === '/') {
         const reqs = await getRequires(path.resolve(reqPath, '../', req) + '.js');

        _.each(reqs.requires, r => requires.add(r));
      }
    });

    return {requires: [reqPath, ...Array.from(requires).filter(r => r[0] !== '.')]};
  }

  return {...data, ...await getRequires(data.path)}
}

async function copyDependencies(data) {
  const flowName = path.basename(data.path, '.js');
  const workDir = path.resolve(process.cwd(), '.tmp', flowName);
  const npmInstall = [];

  await fs.mkdirAsync(workDir, {recursive: true});
  
  await Promise.each(data.requires, async file => {
    if(file[0] === '/') {
      await fs.mkdirAsync(path.dirname(path.resolve(workDir, path.relative(data.project, file))), {recursive: true});
      await fs.copyFileAsync(file, path.resolve(workDir, path.relative(data.project, file)));

      return;
    }

    npmInstall.push(file);
  });

  return {npmInstall, workDir, version: data.version, projectName: data.projectName, path: data.path};
}

async function createIndex(data) {
  const flowPath = data.path;
  const currentFlowsFolderPath = `${process.cwd()}/flows`;
  const flowName = flowPath.substring(currentFlowsFolderPath.length + 1, flowPath.indexOf('.js'));
  const indexFile = `
exports.handler = async (event, context) => {
  const { Flows } = require('@codeinkit/flows');
  const flows = new Flows();
  const flow = require('./flows/${flowName}');
  
  
  flows.register('${flowName}', flow);
  flows.hook('exception', e=>console.error(JSON.stringify(e)));
  flows.hook('pre_action', e=>console.log(JSON.stringify(e)));
  const response = await flows.execute('${flowName}', event);

  return {
    statusCode: 200,
    body: JSON.stringify(response)
  }
};`;

  await fs.promises.writeFile(`${data.workDir}/index.js`, indexFile);

  return {...data, flowName};
}

async function installDependencies(data) {
  const run = (command, args, options) => new Promise((resolve, reject) => {
    const p = child_process.spawn(command, args, options);

    p.once('close', resolve);
    p.once('error', reject);
  });

  await run('npm', ['init', '--yes'], {shell: true, cwd: data.workDir});
  await run('npm', ['version', data.version], {shell: true, cwd: data.workDir});
  await run('npm', ['install', '@codeinkit/flows', ..._.filter(data.npmInstall, d => d[0] !== '.' && d[0] !== '/')], {shell: true, cwd: data.workDir});
  
  return data;
}

function zipFlow(data) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(`${data.workDir}.zip`);
    const archive = archiver('zip', {
      zlib: { level: 9 } // Sets the compression level.
    });

    output.once('close', () => {
      resolve(data);
    });

    output.once('error', (err) => {
      reject(err);
    });

    archive.pipe(output);
    archive.directory(data.workDir, false);
    archive.finalize();    
  });
}

async function uploadObject(data) {
  const s3 = new aws.S3();
  const stream = fs.createReadStream(data.workDir + '.zip');
  const uploadFunction = (bucket, key, s) => new Promise((resolve, reject) => s3.upload({Bucket: bucket, Key: key, Body: s}, (err, info ) => {
    if(err) {
      return reject(err);
    }

    resolve(info);
  }));

  const s3Object = await uploadFunction(`flows-framework.${data.projectName}`, `${path.basename(data.workDir)}_${data.version}`, stream);

  return {...data, s3Object};
}

function cloudFormationLambda(data) {
  return {
    [_.camelCase(data.flowName.replace(/\//g, ' ').toUpperCase().replace(/_/g, ' '))]: {
      Type: 'AWS::Lambda::Function',
      Properties: {
        Handler: 'index.handler',
        Runtime: 'nodejs12.x',
        Role: {
          'Fn::GetAtt': [
              'lambdaIAMRole',
              'Arn'
          ]
        },
        Timeout: 60,
        Code: {
          S3Bucket: data.s3Object.Bucket,
          S3Key: data.s3Object.Key
        }
      }
    }
  }
}

module.exports = [
  getRequireFiles,
  copyDependencies,
  createIndex,
  installDependencies,
  zipFlow,
  uploadObject,
  cloudFormationLambda
];