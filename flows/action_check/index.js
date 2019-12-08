const path = require('path');
const fs = require('fs').promises;

function getParams(data) {  
  const flowPath = path.join(process.cwd(), `./flows/${data.flowName}`);
  const flowAction = parseInt(data.flowAction);
  const dataPath = path.join(process.cwd(), data.dataPath);
  const normalizedSetupPath = path.join(process.cwd(), 'setup');
    
  return {
    ...data,
    flowPath,
    flowAction,
    dataPath,
    normalizedSetupPath
  }
}

function UNSAFE_dynamicRequire(data, unsafe) {
  try {
    const flow = require(data.flowPath);
    const actiondata = require(data.dataPath);
    const action = flow[data.flowAction];

    unsafe.flow = flow;
    unsafe.data = actiondata;
    unsafe.action = action;
  } catch(err) {
    console.error(err);
    
  }

  return data;
}

async function UNSAFE_includeSetup(data, unsafe) {
  (await fs.readdir(data.normalizedSetupPath)).forEach((filename) => {
    if(filename === '.gitkeep') return;
    const singleSetup = require('./setup/' + filename);
    const filenameWithoutSuffix = filename.split('.').slice(0, -1).join('.');
    global[filenameWithoutSuffix] = singleSetup;
  });
  
  return data;
}

async function UNSAFE_executeAction(data, unsafe) {
  console.log('EXECUTING:', data.flowName, data.flowAction, unsafe.action.name, unsafe.data);

  try {
    console.log(`########################################`);
    console.log(await unsafe.action(unsafe.data));
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
  UNSAFE_executeAction
];