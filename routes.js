const yargs = require('yargs');

module.exports = function(exec) {
  yargs
  .command('generate <template>', 'generate flow server framework working with flows', () => {}, (argv) => {
    exec(`generate/${argv.template}`, {});
  })
  .command('add <framework>', 'add flows client to "angular-cli" or "create-react-app" project', () => {}, (argv) => {
    exec(`add/${argv.framework}`, {});
  })
  .command('action <flowName> <flowActionNumber> <dataPath>', 'execute a specific action with data from path', () => {}, (argv) => {
    exec('run/action', {flowName: argv.flowName, flowAction: argv.flowActionNumber, dataPath: argv.dataPath}, {});
  })
  .command('flow <flowName> <dataPath>', 'execute a specific flow', () => {}, (argv) => {
    exec('run/flow', {flowName: argv.flowName, dataPath: argv.dataPath}, {});
  })
  .help()
  .argv;
}