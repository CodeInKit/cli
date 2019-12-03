const path = require('path')
const {Flows} = require('flows');
const flows = new Flows();
const fs = require('fs').promises;
const Promise = require('bluebird');

const normalizedFlowsPath = path.join(__dirname, 'flows');
const normalizedSetupPath = path.join(__dirname, 'setup');

(async () => {
  await Promise.each(fs.readdir(normalizedFlowsPath), async (filename) => {
    if(filename === '.gitkeep') return;

    const stats = await fs.stat(normalizedFlowsPath + '/' + filename);
    let isNamespace = false;

    if(stats.isDirectory()) {
      try {
        await fs.access(normalizedFlowsPath + '/' + filename + '/index.js');
      } catch(err) {
        isNamespace = true;
      }
    }
    
    if(isNamespace) {
      (await fs.readdir(normalizedFlowsPath + '/' + filename)).forEach(async (nfilename) => {
        const flow = require(normalizedFlowsPath + '/' + filename + '/' + nfilename);
        const filenameWithoutSuffix = nfilename.indexOf('.') !== -1 ? nfilename.split('.').slice(0, -1).join('.') : nfilename;
        flows.register(filename +'/' + filenameWithoutSuffix, flow);
      });
    } else {
      const flow = require(normalizedFlowsPath + '/' + filename);
      const filenameWithoutSuffix = filename.indexOf('.') !== -1 ? filename.split('.').slice(0, -1).join('.') : filename;
      flows.register(filenameWithoutSuffix, flow);
    }
  });

  (await fs.readdir(normalizedSetupPath)).forEach((filename) => {
    const singleSetup = require('./setup/' + filename);
    const filenameWithoutSuffix = filename.split('.').slice(0, -1).join('.');
    global[filenameWithoutSuffix] = singleSetup;
  });

  require('./routes')(flows.execute.bind(flows));
})();
