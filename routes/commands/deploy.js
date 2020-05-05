
module.exports = (exec) => {

  return {
    command: 'deploy <type> [provider]',
    desc: 'Deploy to serverless provider (currently supported only aws)',
    builder: {
      type: {
        default: 'lambda',
        choices: ['lambda', 'rest']
      },
      provider: {
        default: 'aws',
        choices: ['aws']
      },
    },
    handler: (argv) => {
      exec(`deploy/${argv.provider}/${argv.type}`, {});
    }
  }
}

