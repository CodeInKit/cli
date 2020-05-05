const yargs = require('yargs');
const _ = require('lodash');
const generateCommand = require('./commands/generate');
const runCommand = require('./commands/run');
const deployCommand = require('./commands/deploy');

module.exports = async function(exec) {

  yargs
    .command(generateCommand(exec))
    .command(await runCommand(exec))
    .command(deployCommand(exec))
    .completion()
    .help()
    .argv;
}