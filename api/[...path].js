const app = require('../backend/server');

// Vercel Node.js Serverless Function 入口，
// 直接把请求交给 Express 实例处理。
module.exports = (req, res) => {
  return app(req, res);
};

