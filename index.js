#!/usr/bin/env node

const flowsFramework = require('@codeinkit/flows-framework');
const routes = require('./routes/cli');

(async () => {
  await flowsFramework.init(__dirname);
  await flowsFramework.addRoute(routes);
})()