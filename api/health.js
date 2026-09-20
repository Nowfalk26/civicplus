const app = require('../backend/dist/app').default || require('../backend/dist/app');

module.exports = (req, res) => {
  return app(req, res);
};
module.exports.default = module.exports;
