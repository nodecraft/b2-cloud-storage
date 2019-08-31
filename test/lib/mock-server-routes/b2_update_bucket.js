'use strict';
module.exports = function(mocks, config){
	/* update bucket with invalid headers */
	mocks.api.post('/b2api/v2/b2_update_bucket').matchHeader('authorization', function(val){
		return val !== config.auth.all.authToken && val !== config.auth.buckets.authToken && val !== config.auth.none.authToken;
	}).reply(401, {code: 'bad_auth_token', message: '', status: 401});

	/* update bucket with valid headers and missing `applicationKeyId` */
	mocks.api.post('/b2api/v2/b2_update_bucket', body=> !body.accountId).matchHeader('authorization', config.auth.buckets.authToken).reply(function(){
		return [
			400,
			{
				code: 'bad_request',
				message: 'required field accountId is missing',
				status: 400
			}
		];
	});

	/* update bucket with valid headers and missing `bucketId` */
	mocks.api.post('/b2api/v2/b2_update_bucket', {
		accountId: config.auth.buckets.responseAccountId
	}).matchHeader('authorization', config.auth.buckets.authToken).reply(function(){
		return [
			400,
			{
				code: 'bad_request',
				message: 'required field bucketId is missing',
				status: 400
			}
		];
	});

	/* update bucket with valid headers and valid params, but bad permissions */
	mocks.api.post('/b2api/v2/b2_update_bucket', {
		accountId: config.auth.none.responseAccountId,
		bucketId: config.bucketId
	}).matchHeader('authorization', config.auth.none.authToken).reply(function(){
		return [
			401,
			config.responses.unauthorized
		];
	});

	/* update bucket with valid headers and valid params, and good permissions */
	mocks.api.post('/b2api/v2/b2_update_bucket', {
		accountId: config.auth.buckets.responseAccountId,
		bucketId: config.bucketId
	}).matchHeader('authorization', config.auth.buckets.authToken).reply(function(){
		return [
			200,
			{
				accountId: config.auth.buckets.responseAccountId,
				bucketId: config.bucketId,
				bucketInfo: {},
				bucketName: config.bucketName,
				bucketType: config.bucketType,
				corsRules: [],
				lifecycleRules: [],
				revision: 2
			}
		];
	});
};