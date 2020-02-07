
const Promise = require('bluebird');
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

function generateFromTemplate(dirname) {
  return [
    spinnerActions.spinnerStart('Generate Flow Server!'),
    spinnerActions.spinnerMessage('npm init'),
    spawn('npm', ['init', '--yes'], {shell: true}),
    spinnerActions.spinnerMessage('npm install @codeinkit/flows-framework'),
    spawn('npm', ['install', '@codeinkit/flows-framework'], {shell: true}), 
    spinnerActions.spinnerMessage('git init'),
    spawn('git', ['init'], {shell: true}), 
    spinnerActions.spinnerMessage('copy template files'),
    fileActions.copyTemplates(dirname),
    spinnerActions.spinnerMessage('done'),
    spinnerActions.spinnerStop,
    finishMessage
  ];
}

module.exports = generateFromTemplate;