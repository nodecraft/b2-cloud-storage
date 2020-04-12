'use strict';
module.exports = function(mocks, config){
	/* list file names with invalid headers */
	mocks.api.post('/b2api/v2/b2_list_file_names').matchHeader('authorization', function(val){
		return val !== config.auth.all.authToken && val !== config.auth.buckets.authToken && val !== config.auth.none.authToken;
	}).reply(401, {code: 'bad_auth_token', message: '', status: 401});

	/* create bucket with valid headers and missing `bucketId` */
	mocks.api.post('/b2api/v2/b2_list_file_names', body => !body.bucketId).matchHeader('authorization', config.auth.all.authToken).reply(function(){
		return [
			400,
			{
				code: 'bad_request',
				message: 'required field bucketId is missing',
				status: 400
			}
		];
	});

	/* list file names with valid headers and valid params, but bad permissions */
	mocks.api.post('/b2api/v2/b2_list_file_names', {
		bucketId: config.bucketId
	}).matchHeader('authorization', config.auth.none.authToken).reply(function(){
		return [
			401,
			config.responses.unauthorized
		];
	});

	/* list file names with valid headers and valid params, and good permissions */
	mocks.api.post('/b2api/v2/b2_list_file_names', {
		bucketId: config.bucketId
	}).matchHeader('authorization', config.auth.all.authToken).reply(function(){
		return [
			200,
			{
				files: [
					{
						accountId: config.auth.all.accountId,
						action: 'upload',
						bucketId: config.bucketId,
						contentLength: config.file.destination.contentLength,
						contentSha1: config.file.destination.contentSha1,
						contentType: config.file.destination.contentType,
						fileId: config.file.destination.fileId,
						fileInfo: {
							src_last_modified_millis: config.file.destination.fileInfo
						},
						fileName: config.file.destination.fileName,
						uploadTimestamp: config.file.destination.uploadTimestamp
					}
				],
				nextFileName: null
			}
		];
	});
};