const path = require('path');
const { PerformanceObserver, performance } = require('perf_hooks');
const Promise = require('bluebird');

function getParams({flowName, actionNumber, data, pref, json}) {  
  const flowPath = path.join(process.cwd(), `./flows/${flowName}`);
    
  return {
    flowName, actionNumber, data, pref, json, flowPath
  }
}

function dynamicRequire(data, unsafe) {
  try {    
    const flow = require(data.flowPath);
    const action = flow[data.actionNumber];
    const actiondata = JSON.parse(data.data);

    unsafe.flow = flow;
    unsafe.data = actiondata;
    unsafe.action = action;
  } catch(err) {
    console.error(err);
  }

  return data;
}

async function executeAction(data, unsafe) {
  const obs = new PerformanceObserver((items) => {
    console.log(items.getEntries()[0].duration);
    performance.clearMarks();
  });
  obs.observe({ entryTypes: ['measure'] });
  
  console.log('EXECUTING:', data.flowName, data.actionNumber, unsafe.action.name, unsafe.data);

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
    console.error(`ERROR: ${err.message ? err.message : err}`);
    console.log(`########################################`);
  }

  process.exit(0);
}

module.exports = [
  getParams, 
  dynamicRequire, 
  executeAction
];