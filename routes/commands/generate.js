
module.exports = (exec) => {

  return {
    command: 'generate [template]',
    desc: 'Generate flow server framework working with flows',
    builder: {
      template: {
        default: 'flows-rest-server',
        choices: ['flows-rest-server', 'flows-server', 'flows-ws-server']
      }
    },
    handler: (argv) => {
      exec(`generate/${argv.template}`, {});
    }
  }
}

