const Promise = require('bluebird');
const ncp = require('ncp').ncp;
const { spawn } = require('child_process');
const fs = require('fs').promises;

/**
 * @TODO: need to check ts and yarn
 */

function stringSplice(string, start, delCount, newSubStr) {
  return string.slice(0, start) + newSubStr + string.slice(start + Math.abs(delCount));
}

function npmInstall() {
  console.log('npm install dependencies');
  const dependencies = [
    '@codeinkit/react-flows'
  ];
  const installDeps = spawn('npm', ['install', ...dependencies], {shell: true});

  return new Promise(resolve => {
    installDeps.stdout.once('close', () => resolve())
  })
}

function copyFiles() {
  console.log('copy template');
  return new Promise((resolve, reject) => {
    ncp(`${__dirname}/templates`, process.cwd(), err => {
      if(!err) return resolve();
      console.error(err);
      
      return reject(err);
    });
  });
}

async function changeFiles() {
  console.log('change files');
  
  const mainIndexPath = `${process.cwd()}/src/index.js`;
  const mainIndex = await fs.readFile(mainIndexPath, 'utf-8');
  const lastImport = mainIndex.lastIndexOf('import');
  const lineToAppend = mainIndex.indexOf('\n', lastImport);
  const newMainIndex = stringSplice(mainIndex, lineToAppend + 1, 0, `import './flows';\n`);

  await fs.writeFile(mainIndexPath, newMainIndex);
}

module.exports = [
  npmInstall, 
  copyFiles, 
  changeFiles
];