const serverless = require('serverless-http');
const app = require('./server');

// Wrap the Express API for deployment onto AWS Lambda.
// API Gateway acts as the trigger mapping HTTP paths directly to this handler.
module.exports.handler = serverless(app);
