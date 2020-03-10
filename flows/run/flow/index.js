const path = require('path');
const fs = require('fs').promises;
const { Flows } = require('@codeinkit/flows');
const { PerformanceObserver, performance } = require('perf_hooks');
const Promise = require('bluebird');
const clearModule = require('clear-module');
const executionFlow = new Flows();
const obs = new PerformanceObserver((items) => {
  console.log(items.getEntries()[0].duration);
  performance.clearMarks();
});
executionFlow.hook('exception', console.error);
executionFlow.hook('pre_action', ({actionFn, input}) => {
  console.log(`running action ${actionFn.name} with:`, input);
  
});

function getParams(data) {  
  const json = data.dataPath;
  const flowPath = path.join(process.cwd(), `./flows/${data.flowName}`);
  const dataPath = path.join(process.cwd(), data.dataPath);
  const normalizedSetupPath = path.join(process.cwd(), 'setup');
    
  return {
    ...data,
    json,
    flowPath,
    dataPath,
    normalizedSetupPath
  }
}

function UNSAFE_dynamicRequire(data, unsafe) {
  try {
    const flow = require(data.flowPath);
    clearModule(data.flowPath);
    let actiondata = {};
    try {
      actiondata = require(data.dataPath);
    } catch(err) {
      try {
        actiondata = JSON.parse(data.json);
      } catch(err) {
        throw err;
      }
    }

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
    clearModule(data.normalizedSetupPath + '/' + filename);
    const filenameWithoutSuffix = filename.split('.').slice(0, -1).join('.');
    global[filenameWithoutSuffix] = singleSetup;
  });
  
  return data;
}

async function UNSAFE_executeFlow(data, unsafe) {
  executionFlow.register(data.flowName, unsafe.flow);
  obs.observe({ entryTypes: ['measure'] });
  console.log('EXECUTING:', data.flowName, unsafe.data);

  try {
    console.log(`########################################`);
    if(unsafe.data.length) {
      await Promise.each(unsafe.data, async (item, idx) => {
        performance.mark('flow_start_'+idx);
        const res = await executionFlow.execute(data.flowName, item);
        performance.mark('flow_end'+idx);
        console.log('data from flow', res);
        performance.measure('flow_start to flow_end', 'flow_start'+idx, 'flow_end'+idx);

        console.log(`#########COPYABLE JSON##################`);
        console.log(JSON.stringify(res));
        console.log(`########################################`);
      })
    } else {
      performance.mark('flow_start');
      const res = await executionFlow.execute(data.flowName, unsafe.data);
      performance.mark('flow_end');
      console.log(res);
      performance.measure('flow_start to flow_end', 'flow_start', 'flow_end');
      console.log(`#########COPYABLE JSON##################`);
      console.log(JSON.stringify(res));
      console.log(`########################################`);
      }
  } catch(err) {
    console.error(`ERROR: ${err.message}`);
    console.log(`########################################`);
  }

  if(!data.isWatch) {
    process.exit(0);
  }

  return data;
}


module.exports = [
  getParams, 
  UNSAFE_dynamicRequire, 
  UNSAFE_includeSetup, 
  UNSAFE_executeFlow
];