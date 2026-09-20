const app = require('../dist/app').default || require('../dist/app');

module.exports = (req, res) => {
  if (!req.url || req.url === '/' || req.url === '') {
    req.url = '/api/health';
  }
  return app(req, res);
};
module.exports.default = module.exports;
