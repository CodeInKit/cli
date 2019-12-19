#!/usr/bin/env node

const path = require('path')
const normalizedFlowsPath = path.join(__dirname, 'flows');
const normalizedSetupPath = path.join(__dirname, 'setup');
const { Flows } = require('@codeinkit/flows');
const flows = new Flows();
const fs = require('fs');

flows.hook('exception', console.error);

flows.hook('pre_action', console.log);

fs.readdirSync(normalizedFlowsPath).forEach(function(filename) {
  const flow = require('./flows/' + filename);
  const filenameWithoutSuffix = filename.indexOf('.') !== -1 ? filename.split('.').slice(0, -1).join('.') : filename;
  flows.register(filenameWithoutSuffix, flow);
});


fs.readdirSync(normalizedSetupPath).forEach(function(filename) {
  const singleSetup = require('./setup/' + filename);
  const filenameWithoutSuffix = filename.split('.').slice(0, -1).join('.');
  global[filenameWithoutSuffix] = singleSetup;
});

require('./routes')(flows.execute.bind(flows));