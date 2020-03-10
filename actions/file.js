const ncp = require('ncp').ncp;

function copyTemplatesWrapper(dirname) {
  return function copyTemplates() {
    return new Promise((resolve, reject) => {
      ncp(`${dirname}/_templates`, process.cwd(), err => {
        if(!err) return resolve({});
        return reject(err);
      });
    });
  }
}

module.exports = {
  copyTemplates: copyTemplatesWrapper
}