'use strict';
const config = {
	accountId: 'mock-123456',
	applicationKey: 'mock-abcdefg',
	authToken: 'mock-token123456'
};
// create and store auth header for testing
config.authHeader = 'Basic ' + Buffer.from(config.accountId + ':' + config.applicationKey).toString('base64');
module.exports = config;