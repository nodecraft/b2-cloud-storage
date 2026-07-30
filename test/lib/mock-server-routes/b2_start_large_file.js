'use strict';
module.exports = function(mocks, config) {
	/* start large file with invalid headers */
	mocks.api.post('/b2api/v2/b2_start_large_file').matchHeader('authorization', function(val) {
		return val !== config.auth.all.authToken && val !== config.auth.buckets.authToken && val !== config.auth.none.authToken;
	}).reply(401, { code: 'bad_auth_token', message: '', status: 401 });

	/* start large file with valid headers and missing `bucketId` */
	mocks.api.post('/b2api/v2/b2_start_large_file', body => !body.bucketId).matchHeader('authorization', config.auth.buckets.authToken).reply(function() {
		return [
			400,
			{
				code: 'bad_request',
				message: 'required field bucketId is missing',
				status: 400,
			},
		];
	});

	/* start large file with valid headers and missing `fileName` */
	mocks.api.post('/b2api/v2/b2_start_large_file', body => !body.fileName).matchHeader('authorization', config.auth.buckets.authToken).reply(function() {
		return [
			400,
			{
				code: 'bad_request',
				message: 'required field fileName is missing',
				status: 400,
			},
		];
	});

	/* start large file with valid headers and valid params, and good permissions */
	mocks.api.post('/b2api/v2/b2_start_large_file').matchHeader('authorization', config.auth.buckets.authToken).reply(function(uri, body) {
		return [
			200,
			{
				accountId: config.auth.buckets.accountId,
				action: 'start',
				bucketId: body.bucketId,
				contentLength: 0,
				contentSha1: 'none',
				contentType: body.contentType,
				fileId: config.file.largeCopy.fileId,
				fileInfo: body.fileInfo,
				fileName: body.fileName,
				uploadTimestamp: config.file.largeCopy.uploadTimestamp,
			},
		];
	});
};
