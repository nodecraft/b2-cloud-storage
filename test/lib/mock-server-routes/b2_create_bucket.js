'use strict';
module.exports = function(mocks, config){
	/* create bucket with invalid headers */
	mocks.api.post('/b2api/v2/b2_create_bucket').matchHeader('authorization', function(val){
		return val !== config.authToken;
	}).reply(401, {code: 'bad_auth_token', message: '', status: 401});


	/* create bucket with valid headers and missing `bucketName` */
	mocks.api.post('/b2api/v2/b2_create_bucket', {
		accountId: config.auth.buckets.responseAccountId,
	}).matchHeader('authorization', config.authToken).reply(function(){
		return [
			400,
			{
				code: 'bad_request',
				message: 'required field bucketName is missing',
				status: 400
			}
		];
	});

	/* create bucket with valid headers and missing `bucketType` */
	mocks.api.post('/b2api/v2/b2_create_bucket', {
		accountId: config.auth.buckets.responseAccountId,
		bucketName: config.bucketName
	}).matchHeader('authorization', config.authToken).reply(function(){
		return [
			400,
			{
				code: 'bad_request',
				message: 'required field bucketType is missing',
				status: 400
			}
		];
	});

	/* create bucket with valid headers and valid params, but bad permissions */
	mocks.api.post('/b2api/v2/b2_create_bucket', {
		accountId: config.auth.none.responseAccountId,
		bucketName: config.bucketName,
		bucketType: config.bucketType
	}).matchHeader('authorization', config.authToken).reply(function(){
		return [
			401,
			config.responses.unauthorized
		];
	});

	/* create bucket with valid headers and valid params, and good permissions */
	mocks.api.post('/b2api/v2/b2_create_bucket', {
		accountId: config.auth.buckets.responseAccountId,
		bucketName: config.bucketName,
		bucketType: config.bucketType
	}).matchHeader('authorization', config.authToken).reply(function(){
		return [
			200,
			{
				accountId: config.auth.buckets.accountId,
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