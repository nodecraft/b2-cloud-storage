'use strict';
module.exports = function(mocks, config){
	/* list file versions with invalid headers */
	mocks.api.post('/b2api/v2/b2_list_file_versions').matchHeader('authorization', function(val){
		return val !== config.auth.all.authToken && val !== config.auth.buckets.authToken && val !== config.auth.none.authToken;
	}).reply(401, {code: 'bad_auth_token', message: '', status: 401});

	/* list file versions with valid headers and missing `bucketId` */
	mocks.api.post('/b2api/v2/b2_list_file_versions', body=> !body.bucketId).matchHeader('authorization', config.auth.all.authToken).reply(function(){
		return [
			400,
			{
				code: 'bad_request',
				message: 'required field bucketId is missing',
				status: 400
			}
		];
	});

	/* list file versions with valid headers and valid params, but bad permissions */
	mocks.api.post('/b2api/v2/b2_list_file_versions', {
		bucketId: config.bucketId
	}).matchHeader('authorization', config.auth.none.authToken).reply(function(){
		return [
			401,
			config.responses.unauthorized
		];
	});

	/* list file versions with valid headers and valid params, and good permissions */
	mocks.api.post('/b2api/v2/b2_list_file_versions', {
		bucketId: config.bucketId
	}).matchHeader('authorization', config.auth.all.authToken).reply(function(){
		return [
			200,
			{
				files: [
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
				],
				nextFileId: null,
				nextFileName: null
			}
		];
	});
};