const path = require('path');
const fs = require('fs').promises;
const { Flows } = require('@codeinkit/flows');
const executionFlow = new Flows();

function getParams(data) {  
  const flowPath = path.join(process.cwd(), `./flows/${data.flowName}`);
  const dataPath = path.join(process.cwd(), data.dataPath);
  const normalizedSetupPath = path.join(process.cwd(), 'setup');
    
  return {
    ...data,
    flowPath,
    dataPath,
    normalizedSetupPath
  }
}

function UNSAFE_dynamicRequire(data, unsafe) {
  try {
    const flow = require(data.flowPath);
    const actiondata = require(data.dataPath);

    unsafe.flow = flow;
    unsafe.data = actiondata;
  } catch(err) {
    console.error(err);    
  }

  return data;
}

async function UNSAFE_includeSetup(data, unsafe) {
  (await fs.readdir(data.normalizedSetupPath)).forEach((filename) => {
    if(filename === '.gitkeep') return;
    const singleSetup = require(data.normalizedSetupPath + '/' + filename);
    const filenameWithoutSuffix = filename.split('.').slice(0, -1).join('.');
    global[filenameWithoutSuffix] = singleSetup;
  });
  
  return data;
}

async function UNSAFE_executeFlow(data, unsafe) {
  executionFlow.register(data.flowName, unsafe.flow);
  console.log('EXECUTING:', data.flowName, unsafe.data);

  try {
    console.log(`########################################`);
    const res = await executionFlow.execute(data.flowName, unsafe.data);
    console.log(res);
    console.log(`#########COPYABLE JSON##################`);
    console.log(JSON.stringify(res));
    console.log(`########################################`);
  } catch(err) {
    console.error(`ERROR: ${err.message}`);
    console.log(`########################################`);
  }

  process.exit(0);
}

module.exports = [
  getParams, 
  UNSAFE_dynamicRequire, 
  UNSAFE_includeSetup, 
  UNSAFE_executeFlow
];