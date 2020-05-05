
const Promise = require('bluebird');
const fs = require('fs').promises;
const {spawn} = require('@codeinkit/flows-contrib-node/actions/spawn');
const figlet = require('figlet');
const terminalLink = require('terminal-link');
const chalk = require('chalk');
const spinnerActions = require('../../actions/spinner');
const fileActions = require('../../actions/file');

function finishMessage() {
  return new Promise(resolve => {
    figlet('CODE IN KIT\nFLOWS\n\tFRAMEWORK', function(err, text) {
      if (err) {
          return;
      }
      console.log(chalk.blue.bgBlack(text));
      const link = terminalLink('FLOWS FRAMEWORK', 'https://github.com/CodeInKit/flows-framework');
      console.log(`for more details\n${link}`);
      resolve(data);
    });
  });
}

async function updatePackageJson(data) {
  const package = require(`${process.cwd()}/package.json`);

  package.scripts = {
    start: 'node .',
    deploy: 'cik deploy lambda',
    test: 'echo "no test platform is setup yet"'
  }

  await fs.writeFile(`${process.cwd()}/package.json`, JSON.stringify(package, null, 2));
  return data;
}

function generateFromTemplate(dirname) {
  return [
    spinnerActions.spinnerStart('Generate Flow Server!'),
    spinnerActions.spinnerMessage('npm init'),
    spawn('npm', ['init', '--yes'], {shell: true}),
    spinnerActions.spinnerMessage('npm install @codeinkit/flows-framework @codeinkit/cli'),
    spawn('npm', ['install', '@codeinkit/flows-framework', '@codeinkit/cli'], {shell: true}), 
    spinnerActions.spinnerMessage('git init'),
    spawn('git', ['init'], {shell: true}), 
    spinnerActions.spinnerMessage('copy template files'),
    fileActions.copyTemplates(dirname),
    spinnerActions.spinnerMessage('update package.json'),
    updatePackageJson,
    spinnerActions.spinnerMessage('done'),
    spinnerActions.spinnerStop,
    finishMessage
  ];
}

module.exports = generateFromTemplate;