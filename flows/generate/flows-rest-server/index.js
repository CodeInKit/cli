const generateFromTemplate = require('../_generateFromTemplate');
const {spawn} = require('@codeinkit/flows-contrib-node/actions/spawn');
const spinnerActions = require('../../../actions/spinner');

const flow = generateFromTemplate(__dirname);

flow.splice(5,0, spinnerActions.spinnerMessage('npm install @codeinkit/express-routes'));
flow.splice(6,0, spawn('npm', ['install', '@codeinkit/express-routes'], {shell: true}));

module.exports = flow;