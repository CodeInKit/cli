const Promise = require('bluebird');
const ncp = require('ncp').ncp;
const { spawn } = require('child_process');


/**
 * @TODO: need to check if use yarn
 * @TODO: need to change template so the flows loader would be in different file
 */

function npmInit() {
  console.log('npm init');
  
  const init = spawn('npm', ['init','--yes'], {shell: true});

  return new Promise(resolve => {
    init.stdout.once('close', () => resolve())
  });
}

function npmInstall() {
  console.log('npm install dependencies');
  const dependencies = [
    'bluebird',
    '@codeinkit/flows'
  ];
  const installDeps = spawn('npm', ['install', ...dependencies], {shell: true});

  return new Promise(resolve => {
    installDeps.stdout.once('close', () => resolve())
  })
}

function gitInit() {
  console.log('git init');
  const init = spawn('git', ['init'], {shell: true});

  return new Promise(resolve => {
    init.stdout.once('close', () => resolve())
  })
}

function copyFiles() {
  console.log('copy template');
  return new Promise((resolve, reject) => {
    ncp(`${__dirname}/templates`, process.cwd(), err => {
      if(!err) return resolve();
      return reject(err);
    });
  });
}

module.exports = [npmInit, npmInstall, gitInit, copyFiles];