'use strict';
module.exports = function(mocks, config){
	/* delete key with invalid headers */
	mocks.api.post('/b2api/v2/b2_delete_key').matchHeader('authorization', function(val){
		return val !== config.auth.all.authToken && val !== config.auth.buckets.authToken && val !== config.auth.none.authToken;
	}).reply(401, {code: 'bad_auth_token', message: '', status: 401});


	/* delete key with valid headers and missing `applicationKeyId` */
	mocks.api.post('/b2api/v2/b2_delete_key', body=> !body.applicationKeyId).matchHeader('authorization', config.auth.buckets.authToken).reply(function(){
		return [
			400,
			{
				code: 'bad_request',
				message: 'required field applicationKeyId is missing',
				status: 400
			}
		];
	});

	/* delete key with valid headers and valid params, but bad permissions */
	mocks.api.post('/b2api/v2/b2_delete_key', {
		applicationKeyId: config.auth.none.applicationKeyId
	}).matchHeader('authorization', config.auth.none.authToken).reply(function(){
		return [
			401,
			config.responses.unauthorized
		];
	});

	/* delete key with valid headers and valid params, and good permissions */
	mocks.api.post('/b2api/v2/b2_delete_key', {
		applicationKeyId: config.auth.buckets.applicationKeyId
	}).matchHeader('authorization', config.auth.buckets.authToken).reply(function(){
		return [
			200,
			{
				keyName: config.auth.buckets.keyName,
				applicationKeyId: config.auth.buckets.applicationKeyId,
				capabilities: config.auth.buckets.capabilities,
				accountId: config.auth.buckets.accountId,
				expirationTimestamp: 1536964279000,
				bucketId: config.bucketId,
				namePrefix: ''
			}
		];
	});
};