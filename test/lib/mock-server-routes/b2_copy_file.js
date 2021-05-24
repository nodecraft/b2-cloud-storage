'use strict';
module.exports = function(mocks, config){
	/* copy file with invalid headers */
	mocks.api.post('/b2api/v2/b2_copy_file').matchHeader('authorization', function(val){
		return val !== config.auth.all.authToken && val !== config.auth.buckets.authToken && val !== config.auth.none.authToken;
	}).reply(401, {code: 'bad_auth_token', message: '', status: 401});

	/* copy file with valid headers and missing `sourceFileId` */
	mocks.api.post('/b2api/v2/b2_copy_file', body => !body.sourceFileId).matchHeader('authorization', config.auth.buckets.authToken).reply(function(){
		return [
			400,
			{
				code: 'bad_request',
				message: 'required field sourceFileId is missing',
				status: 400,
			},
		];
	});

	/* copy file with valid headers and missing `fileName` */
	mocks.api.post('/b2api/v2/b2_copy_file', {
		sourceFileId: config.file.source.fileId,
	}).matchHeader('authorization', config.auth.buckets.authToken).reply(function(){
		return [
			400,
			{
				code: 'bad_request',
				message: 'required field fileName is missing',
				status: 400,
			},
		];
	});

	/* copy file with valid headers and valid params, but bad permissions */
	mocks.api.post('/b2api/v2/b2_copy_file', {
		sourceFileId: config.file.source.fileId,
		fileName: config.file.destination.fileName,
	}).matchHeader('authorization', config.auth.none.authToken).reply(function(){
		return [
			401,
			config.responses.unauthorized,
		];
	});

	/* copy file with valid headers and valid params, and good permissions */
	mocks.api.post('/b2api/v2/b2_copy_file', {
		sourceFileId: config.file.source.fileId,
		fileName: config.file.destination.fileName,
	}).matchHeader('authorization', config.auth.buckets.authToken).reply(function(){
		return [
			200,
			{
				accountId: config.auth.buckets.accountId,
				action: "copy",
				bucketId: config.bucketId,
				contentLength: config.file.destination.contentLength,
				contentSha1: config.file.destination.contentSha1,
				contentType: config.file.destination.contentType,
				fileId: config.file.destination.fileId,
				fileInfo: {
					src_last_modified_millis: config.file.destination.fileInfo,
				},
				fileName: config.file.destination.fileName,
				uploadTimestamp: config.file.destination.uploadTimestamp,
			},
		];
	});
};