'use strict';
module.exports = function(mocks, config){
	/* get file info with invalid headers */
	mocks.api.post('/b2api/v2/b2_get_file_info').matchHeader('authorization', function(val){
		return val !== config.auth.all.authToken && val !== config.auth.buckets.authToken && val !== config.auth.none.authToken;
	}).reply(401, {code: 'bad_auth_token', message: '', status: 401});

	/* create bucket with valid headers and missing `fileId` */
	mocks.api.post('/b2api/v2/b2_get_file_info', body=> !body.fileId).matchHeader('authorization', config.auth.all.authToken).reply(function(){
		return [
			400,
			{
				code: 'bad_request',
				message: 'required field fileId is missing',
				status: 400
			}
		];
	});

	/* get file info with valid headers and valid params, but bad permissions */
	mocks.api.post('/b2api/v2/b2_get_file_info', {
		fileId: config.file.source.fileId
	}).matchHeader('authorization', config.auth.none.authToken).reply(function(){
		return [
			401,
			config.responses.unauthorized
		];
	});

	/* get file info with valid headers and valid params, and good permissions */
	mocks.api.post('/b2api/v2/b2_get_file_info', {
		fileId: config.file.source.fileId
	}).matchHeader('authorization', config.auth.all.authToken).reply(function(){
		return [
			200,
			{
				accountId: config.auth.buckets.accountId,
				action: "start",
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
		];
	});
};