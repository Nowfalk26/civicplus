const app = require('../dist/app').default || require('../dist/app');

module.exports = (req, res) => {
  return app(req, res);
};
module.exports.default = module.exports;
