'use strict';
module.exports = function(mocks, config){
	/* list keys with invalid headers */
	mocks.api.post('/b2api/v2/b2_list_keys').matchHeader('authorization', function(val){
		return val !== config.auth.all.authToken && val !== config.auth.buckets.authToken && val !== config.auth.none.authToken;
	}).reply(401, {code: 'bad_auth_token', message: '', status: 401});

	/* list keys with valid headers and missing `applicationKeyId` */
	mocks.api.post('/b2api/v2/b2_list_keys', body => !body.accountId).matchHeader('authorization', config.auth.all.authToken).reply(function(){
		return [
			400,
			{
				code: 'bad_request',
				message: 'required field accountId is missing',
				status: 400,
			},
		];
	});

	/* list keys with valid headers and valid params, but bad permissions */
	mocks.api.post('/b2api/v2/b2_list_keys', {
		accountId: config.auth.none.responseAccountId,
	}).matchHeader('authorization', config.auth.none.authToken).reply(function(){
		return [
			401,
			config.responses.unauthorized,
		];
	});

	/* list keys with valid headers and valid params, and good permissions */
	mocks.api.post('/b2api/v2/b2_list_keys', {
		accountId: config.auth.all.responseAccountId,
	}).matchHeader('authorization', config.auth.all.authToken).reply(function(){
		return [
			200,
			{
				keys: [
					{
						keyName: config.auth.all.keyName,
						applicationKeyId: config.auth.all.applicationKeyId,
						capabilities: config.auth.all.capabilities,
						accountId: config.auth.all.accountId,
					},
				],
				nextApplicationKeyId: undefined,
			},
		];
	});
};