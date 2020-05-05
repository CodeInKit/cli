const fs = require('fs-extra');

function copyTemplatesWrapper(dirname) {
  return function copyTemplates() {
    return fs.copy(`${dirname}/_templates`, process.cwd())
      .then(()=>({}))
      .catch(err => new Error(err));
  }
}

module.exports = {
  copyTemplates: copyTemplatesWrapper
}