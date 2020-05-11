const fs = require('fs').promises;
const fse = require('fs-extra');

function copyTemplatesWrapper(dirname) {
  return function copyTemplates() {
    return fse.copy(`${dirname}/_templates`, process.cwd())
      .then(()=>({}));
  }
}

function writeFileWrapper(path, content) {
  return function writeFile() {
    return fs.writeFile(path, content)
      .then(()=>({}));
  }
}

module.exports = {
  copyTemplates: copyTemplatesWrapper,
  writeFile: writeFileWrapper
}