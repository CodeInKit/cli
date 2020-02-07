const path = require('path');
const fs = require('fs').promises;
const { PerformanceObserver, performance } = require('perf_hooks');
const Promise = require('bluebird');

function getParams(data) {  
  const flowPath = path.join(process.cwd(), `./flows/${data.flowName}`);
  const flowAction = parseInt(data.flowAction);
  const dataJson = data.dataPath;
  const dataPath = path.join(process.cwd(), data.dataPath);
  const normalizedSetupPath = path.join(process.cwd(), 'setup');
    
  return {
    ...data,
    flowPath,
    flowAction,
    dataPath,
    dataJson,
    normalizedSetupPath
  }
}

function UNSAFE_dynamicRequire(data, unsafe) {
  try {
    
    const flow = require(data.flowPath);
    const action = flow[data.flowAction];
    let actiondata = {};

    try {
      actiondata = require(data.dataPath);
    } catch(err) {
      try {
        actiondata = JSON.parse(data.dataJson);
      } catch(err) {
        throw err;
      }
    }

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
    const singleSetup = require(data.normalizedSetupPath + '/' + filename);
    const filenameWithoutSuffix = filename.split('.').slice(0, -1).join('.');
    global[filenameWithoutSuffix] = singleSetup;
  });
  
  return data;
}

async function UNSAFE_executeAction(data, unsafe) {
  const obs = new PerformanceObserver((items) => {
    console.log(items.getEntries()[0].duration);
    performance.clearMarks();
  });
  obs.observe({ entryTypes: ['measure'] });
  
  console.log('EXECUTING:', data.flowName, data.flowAction, unsafe.action.name, unsafe.data);

  try {
    console.log(`########################################`);
    if(unsafe.data.length) {
      await Promise.each(unsafe.data, async (item, idx) => {
        performance.mark('action_start_'+idx);
        const res = await unsafe.action(item);
        performance.mark('action_end_'+idx);
        performance.measure('action_start to action_end', 'action_start_'+idx, 'action_end_'+idx);
        console.log(res);
        console.log(`#########COPYABLE JSON##################`);
        console.log(JSON.stringify(res));
        console.log(`########################################`);
      })
    } else {
      performance.mark('action_start');
      const res = await unsafe.action(unsafe.data);
      performance.mark('action_end');
      performance.measure('action_start to action_end', 'action_start', 'action_end');
      console.log(res);
      console.log(`#########COPYABLE JSON##################`);
      console.log(JSON.stringify(res));
      console.log(`########################################`);
    }
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