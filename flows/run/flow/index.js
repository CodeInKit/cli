const path = require('path');
const fs = require('fs').promises;
const { Flows } = require('@codeinkit/flows');
const { PerformanceObserver, performance } = require('perf_hooks');
const Promise = require('bluebird');
const executionFlow = new Flows();
const obs = new PerformanceObserver((items) => {
  console.log(items.getEntries()[0].duration);
  performance.clearMarks();
});
executionFlow.hook('exception', console.error);
executionFlow.hook('pre_action', ({actionFn, input}) => {
  console.log(`running action ${actionFn.name} with:`, input);
  
});

function getParams({flowName, actionNumber, data, pref, json}) {  
  const flowPath = path.join(process.cwd(), `./flows/${flowName}`);
    
  return {
    flowName, actionNumber, data, pref, json, flowPath
  }
}

function dynamicRequire(data, unsafe) {
  try {
    const flow = require(data.flowPath);
    const actiondata = JSON.parse(data.data);

    unsafe.flow = flow;
    unsafe.data = actiondata;
  } catch(err) {
    console.error(err);    
  }

  return data;
}

async function executeFlow(data, unsafe) {
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
  dynamicRequire, 
  executeFlow
];