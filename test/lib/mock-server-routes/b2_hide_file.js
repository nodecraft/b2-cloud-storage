'use strict';
module.exports = function(mocks, config) {
	/* hide file with invalid headers */
	mocks.api.post('/b2api/v2/b2_hide_file').matchHeader('authorization', function(val) {
		return val !== config.auth.all.authToken && val !== config.auth.buckets.authToken && val !== config.auth.none.authToken;
	}).reply(401, {code: 'bad_auth_token', message: '', status: 401});

	/* create bucket with valid headers and missing `bucketId` */
	mocks.api.post('/b2api/v2/b2_hide_file', body => !body.bucketId).matchHeader('authorization', config.auth.all.authToken).reply(function() {
		return [
			400,
			{
				code: 'bad_request',
				message: 'required field bucketId is missing',
				status: 400,
			},
		];
	});

	/* hide file with valid headers and missing `fileName` */
	mocks.api.post('/b2api/v2/b2_hide_file', {
		bucketId: config.bucketId,
	}).matchHeader('authorization', config.auth.all.authToken).reply(function() {
		return [
			400,
			{
				code: 'bad_request',
				message: 'required field fileName is missing',
				status: 400,
			},
		];
	});

	/* hide file with valid headers and valid params, but bad permissions */
	mocks.api.post('/b2api/v2/b2_hide_file', {
		bucketId: config.bucketId,
		fileName: config.file.source.fileName,
	}).matchHeader('authorization', config.auth.none.authToken).reply(function() {
		return [
			401,
			config.responses.unauthorized,
		];
	});

	/* hide file with valid headers and valid params, and good permissions */
	mocks.api.post('/b2api/v2/b2_hide_file', {
		bucketId: config.bucketId,
		fileName: config.file.source.fileName,
	}).matchHeader('authorization', config.auth.all.authToken).reply(function() {
		return [
			200,
			{
				accountId: config.auth.buckets.accountId,
				action: 'hide',
				bucketId: config.bucketId,
				contentLength: 0,
				contentSha1: undefined,
				contentType: 'application/x-bz-hide-marker',
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
