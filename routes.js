const yargs = require('yargs');

module.exports = function(exec) {
  yargs
  .command('generate flows-server', 'generate flow server framework working with flows', () => {}, (argv) => {
    exec('generate_flows', {});
  })
  .command('generate ws-flows-server', 'generate flow server that predefined to work with react flows', () => {}, (argv) => {
    exec('generate_react_flows', {});
  })
  .command('add react-flows-client', 'add flows client to "create-react-app" project', () => {}, (argv) => {
    exec('add_flows_react_client', {});
  })  
  .command('add angular-flows-client', 'add flows client to "angular-cli" project', () => {}, (argv) => {
    exec('add_flows_angular_client', {});
  })  
  .command('action <flowName> <flowActionNumber> <dataPath>', 'execute a specific action with data from path', () => {}, (argv) => {
    exec('action_check', {flowName: argv.flowName, flowAction: argv.flowActionNumber, dataPath: argv.dataPath}, {});
  })
  .command('flow <flowName> <dataPath>', 'execute a specific flow', () => {}, (argv) => {
    exec('flow_check', {flowName: argv.flowName, dataPath: argv.dataPath}, {});
  })
  .help()
  .argv;
}