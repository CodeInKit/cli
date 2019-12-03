module.exports = function(exec) {
  const args = process.argv.slice(2).join(' ');
  const routes = {
    'generate flows-server': () => exec('generate_flows', {}),
    'generate react-flows-server': () => exec('generate_react_flows', {}),
    'add react-flows': () => exec('add_flows_react_client', {}),
    
    default: () => console.log('Command not found, Please check the docs')
  };

  routes[args] ? routes[args]() : routes.default();
}