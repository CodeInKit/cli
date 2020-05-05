const fs = require('fs');
const path = require('path');
const Promise = require('bluebird');

async function getFlowsFilesPath() {
  const flowsFiles = [];
  const project = process.cwd();

  async function getFolder(folderPath) {
    const files = await fs.readdirAsync(folderPath);
    
    await Promise.each(files, async file => {
      const fullFilePath = path.join(folderPath, file);
      const stats = await fs.statAsync(fullFilePath);

      if(file[0] === '.') {
        return;
      }

      if(stats.isDirectory()) {
        await getFolder(fullFilePath);
      } else {
        flowsFiles.push(fullFilePath);
      }
    });
  }

  await getFolder(project + '/flows/');

  return { project, flowsFiles }
}

module.exports = async (exec) => {
  const {flowsFiles} = await getFlowsFilesPath().catch(() => ({flowsFiles: []}));

  return {
    command: 'run <command> <flowName> [actionNumber] [data]',
    desc: 'Run a specific flow or action in the flow framework project',
    builder: {
      command: {
        type: 'string',
        choices: ['flow', 'action']
      },
      flowName: {
        type: 'string',
        choices: flowsFiles.map(flowPath => path.relative(`${process.cwd()}/flows`, flowPath).slice(0, -3))
      },
      actionNumber: {
        default: null,
        type: 'number'
      },
      data: {
        default: '{}',
        type: 'string'
      },
      pref: {
        type: 'boolean',
        default: false
      },
      json: {
        type: 'boolean',
        default: false
      },
      watch: {
        type: 'boolean',
        default: false
      },
    },
    handler: (argv) => {
      exec(`run/${argv.command}`, argv);
    }
  }
}

