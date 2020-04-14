const yargs = require('yargs');
const path = require('path');
const fs = require('fs');
const _ = require('lodash');

module.exports = function(exec) {
  yargs
    .command('generate <template>', 'generate flow server framework working with flows', _.noop, (argv) => {
      exec(`generate/${argv.template}`, {});
    })
    .command('add <framework>', 'add flows client to "angular-cli" or "create-react-app" project', _.noop, (argv) => {
      console.error('This functionality is deprecated');
      // exec(`add/${argv.framework}`, {});
    })
    .command('action <flowName> <flowActionNumber> <dataPath>', 'execute a specific action with data from path', _.noop, (argv) => {
      exec('run/action', {flowName: argv.flowName, flowAction: argv.flowActionNumber, dataPath: argv.dataPath}, {});
    })
    .command('flow <flowName> <dataPath>', 'execute a specific flow', _.noop, (argv) => {
      exec('run/flow', {flowName: argv.flowName, dataPath: argv.dataPath}, {});
    })
    .command('deploy <type> <target>', 'deploy specific flow', _.noop, (argv) => {
      if(argv.type === 'flows' && argv.target === 'aws') {
        exec('deploy/flows/aws', {}, {});
      }
      if(argv.type === 'rest' && argv.target === 'aws') {
        exec('deploy/flows/aws_rest', {}, {});
      }
    })
    .command('watch <flowName> <dataPath>', 'execute a specific flow', _.noop, (argv) => {
      const flowPath = path.join(process.cwd(), `./flows/${argv.flowName}.js`);
      fs.watch(flowPath, 'utf-8', () => {
        exec('run/flow', {flowName: argv.flowName, dataPath: argv.dataPath, isWatch: true}, {});
      });
    })
    .completion()
    .help()
    .argv;
}