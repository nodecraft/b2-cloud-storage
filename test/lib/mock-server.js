'use strict';
const nock = require('nock');

const config = require('./config.js');
console.log('Mocking b2 server...');

// TODO: improve and mock more of the b2 api. Split into multiple files
const b2Mock = nock('https://api.backblazeb2.com').persist();

/* authorize with invalid headers */
b2Mock.get('/b2api/v2/b2_authorize_account').matchHeader('authorization', function(val){
	return val !== config.authHeader;
}).reply(401, {code: 'bad_auth_token', message: '', status: 401});

/* authorize with valid headers */
b2Mock.get('/b2api/v2/b2_authorize_account').basicAuth({
	user: 'mock-123456',
	pass: 'mock-abcdefg'
}).reply(function(){
	return [
		200,
		{
			absoluteMinimumPartSize: 5000000,
			accountId: 'e75964ee210c',
			allowed: {
				bucketId: 'mock-bucket-id',
				bucketName: 'mock-bucket-name',
				capabilities: [
					'listBuckets', 'writeFiles', 'deleteFiles'
				],
				namePrefix: null
			},
			apiUrl: 'https://api001.backblazeb2.com',
			authorizationToken: 'mock-token123456',
			downloadUrl: 'https://f001.backblazeb2.com',
			recommendedPartSize: 100000000
		}
	];
});

nock.disableNetConnect(); // disable all other network requests

console.log('Done mocking.');
module.exports = b2Mock;