'use strict';
module.exports = function(mocks, config) {
	/* create key with invalid headers */
	mocks.api.post('/b2api/v2/b2_create_key').matchHeader('authorization', function(val) {
		return val !== config.auth.all.authToken && val !== config.auth.buckets.authToken && val !== config.auth.none.authToken;
	}).reply(401, {code: 'bad_auth_token', message: '', status: 401});

	/* create bucket with valid headers and missing `capabilities` */
	mocks.api.post('/b2api/v2/b2_create_key', {
		accountId: config.auth.buckets.responseAccountId,
	}).matchHeader('authorization', config.auth.buckets.authToken).reply(function() {
		return [
			400,
			{
				code: 'bad_request',
				message: 'required field capabilities is missing',
				status: 400,
			},
		];
	});

	/* create key with valid headers and missing `keyName` */
	mocks.api.post('/b2api/v2/b2_create_key', {
		accountId: config.auth.buckets.responseAccountId,
		capabilities: config.auth.buckets.capabilities,
	}).matchHeader('authorization', config.auth.buckets.authToken).reply(function() {
		return [
			400,
			{
				code: 'bad_request',
				message: 'required field keyName is missing',
				status: 400,
			},
		];
	});

	/* create key with valid headers and valid params, but bad permissions */
	mocks.api.post('/b2api/v2/b2_create_key', {
		accountId: config.auth.none.responseAccountId,
		capabilities: config.auth.none.capabilities,
		keyName: config.auth.none.keyName,
	}).matchHeader('authorization', config.auth.none.authToken).reply(function() {
		return [
			401,
			config.responses.unauthorized,
		];
	});

	/* create key with valid headers and valid params, and good permissions */
	mocks.api.post('/b2api/v2/b2_create_key', {
		accountId: config.auth.buckets.responseAccountId,
		capabilities: config.auth.buckets.capabilities,
		keyName: config.auth.buckets.keyName,
	}).matchHeader('authorization', config.auth.buckets.authToken).reply(function() {
		return [
			200,
			{
				keyName: config.auth.buckets.keyName,
				applicationKeyId: config.auth.buckets.applicationKeyId,
				applicationKey: config.auth.buckets.applicationKey,
				capabilities: config.auth.buckets.capabilities,
				accountId: config.auth.buckets.accountId,
				expirationTimestamp: 1_536_964_279_000,
				bucketId: config.bucketId,
				namePrefix: '',
			},
		];
	});
};
