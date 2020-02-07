const { spawn } = require('@codeinkit/flows-contrib-node/actions/spawn');
const fs = require('fs').promises;
const spinnerActions = require('../../../actions/spinner');
const fileActions = require('../../../actions/file');

function stringSplice(string, start, delCount, newSubStr) {
  return string.slice(0, start) + newSubStr + string.slice(start + Math.abs(delCount));
}

async function changeFiles() {
  const mainIndexPath = `${process.cwd()}/src/main.ts`;
  const mainIndex = await fs.readFile(mainIndexPath, 'utf-8');
  const lastImport = mainIndex.lastIndexOf('import');
  const lineToAppend = mainIndex.indexOf('\n', lastImport);
  const newMainIndex = stringSplice(mainIndex, lineToAppend + 1, 0, `import './app/flows';\n`);

  await fs.writeFile(mainIndexPath, newMainIndex);

  return {};
}

module.exports = [
  spinnerActions.spinnerStart('add flows client to angular-cli project'),
  spinnerActions.spinnerMessage('copy templates'),
  fileActions.copyTemplates(__dirname), 
  spinnerActions.spinnerMessage('npm install @codeinkit/flows-client'),
  spawn('npm', ['install', '@codeinkit/flows-client'], {shell: true}),
  spinnerActions.spinnerMessage('edit main.ts'),
  changeFiles,
  spinnerActions.spinnerStop
];