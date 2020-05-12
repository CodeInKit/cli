const fs = require('fs').promises;
const generateFromTemplate = require('../_generateFromTemplate');
const flow = generateFromTemplate(__dirname);

async function updatePackageJson(data) {
  const package = require(`${process.cwd()}/package.json`);

  package.dependencies = {
    ...package.dependencies,
    "@codeinkit/express-routes": "^1.1.0"
  }
  await fs.writeFile(`${process.cwd()}/package.json`, JSON.stringify(package, null, 2));
  return data;
}

flow.splice(11,0, updatePackageJson);

module.exports = flow;