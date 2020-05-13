
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
    action: 'cik run action',
    flow: 'cik run flow',
    test: 'echo "no test platform is setup yet"'
  }

  package.dependencies = {
    "@codeinkit/cli": "^1.8.5",
    "@codeinkit/flows-framework": "^3.0.6",
  }
  await fs.writeFile(`${process.cwd()}/package.json`, JSON.stringify(package, null, 2));
  return data;
}

function generateFromTemplate(dirname) {
  return [
    spinnerActions.spinnerStart('Generate Flow Server!'),
    spinnerActions.spinnerMessage('npm init'),
    spawn('npm', ['init', '--yes'], { stdio:'inherit'}),
    spinnerActions.spinnerMessage('git init'),
    spawn('git', ['init'], { stdio:'inherit'}), 
    spinnerActions.spinnerMessage('copy template files'),
    fileActions.copyTemplates(dirname),
    spinnerActions.spinnerMessage('create .gitignore'),
    fileActions.writeFile(process.cwd() + '/.gitignore', 'node_modules\n.tmp'),
    spinnerActions.spinnerMessage('update package.json'),
    updatePackageJson,
    spinnerActions.spinnerMessage('npm install'),
    spawn('npm', ['install'], { stdio:'inherit'}),
    spinnerActions.spinnerMessage('done'),
    spinnerActions.spinnerStop,
    finishMessage
  ];
}

module.exports = generateFromTemplate;
