const yargs = require('yargs');

module.exports = function(exec) {
  yargs
  .command('generate flows-server', 'generate flow server framework working with flows', () => {}, (argv) => {
    exec('generate_flows_server', {});
  })
  .command('generate ws-flows-server', 'generate flow server that predefined to work with react flows', () => {}, (argv) => {
    exec('generate_ws_flows_server', {});
  })
  .command('add <type>', 'add flows client to "angular-cli" project', () => {}, (argv) => {
    if(argv.type === 'angular-flows-client') {
      exec('add_flows_angular_client', {});
    } else if(argv.type === 'react-flows-client') {
      exec('add_flows_react_client', {});
    }
    
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