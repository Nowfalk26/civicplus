let app;
let loadError = null;

try {
  app = require('../backend/dist/app').default || require('../backend/dist/app');
} catch (e) {
  loadError = e;
  console.error('CRITICAL BACKEND LOAD ERROR:', e);
}

module.exports = (req, res) => {
  if (loadError) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    return res.end(
      JSON.stringify({
        error: 'Backend module failed to load',
        message: loadError.message,
        stack: loadError.stack,
      })
    );
  }
  return app(req, res);
};
module.exports.default = module.exports;
