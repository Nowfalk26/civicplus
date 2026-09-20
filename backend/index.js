const app = require('./dist/server').default || require('./dist/server') || require('./dist/app').default || require('./dist/app');

module.exports = app;
module.exports.default = app;

