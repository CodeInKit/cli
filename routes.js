const yargs = require('yargs');

module.exports = function(exec) {
  yargs
  .command('generate flows-server', 'generate flow server framework working with flows', () => {}, (argv) => {
    exec('generate_flows', {});
  })
  .command('generate react-flows-server', 'generate flow server that predefined to work with react flows', () => {}, (argv) => {
    exec('generate_react_flows', {});
  })
  .command('add react-flows', 'add react flows to "create-react-app" client', () => {}, (argv) => {
    exec('add_flows_react_client', {});
  })  
  .command('action <flowName> <flowActionNumber> <dataPath>', 'execute a specific action with data from path', () => {}, (argv) => {
    exec('action_check', {flowName: argv.flowName, flowAction: argv.flowActionNumber, dataPath: argv.dataPath}, {});
  })
  .help()
  .argv;
}