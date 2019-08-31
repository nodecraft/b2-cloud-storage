'use strict';
module.exports = function(mocks, config){
	/* list buckets with valid headers and valid params, but bad permissions */
	mocks.api.post('/b2api/v2/b2_list_buckets', {
		accountId: config.auth.none.responseAccountId
	}).matchHeader('authorization', config.auth.none.authToken).reply(function(){
		return [
			401,
			config.responses.unauthorized
		];
	});

	/* list buckets with valid headers and valid params, and good permissions */
	mocks.api.post('/b2api/v2/b2_list_buckets', {
		accountId: config.auth.buckets.responseAccountId
	}).matchHeader('authorization', config.auth.buckets.authToken).reply(function(){
		return [
			200,
			{
				buckets: [
					{
						accountId: config.auth.buckets.accountId,
						bucketId: config.bucketId,
						bucketInfo: {},
						bucketName: config.bucketName,
						bucketType: config.bucketType,
						corsRules: [],
						lifecycleRules: [],
						revision: 1
					}
				]
			}
		];
	});
};