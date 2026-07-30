'use strict';
module.exports = function(mocks, config) {
	/* finish large file with invalid headers */
	mocks.api.post('/b2api/v2/b2_finish_large_file').matchHeader('authorization', function(val) {
		return val !== config.auth.all.authToken && val !== config.auth.buckets.authToken && val !== config.auth.none.authToken;
	}).reply(401, { code: 'bad_auth_token', message: '', status: 401 });

	/* finish large file with valid headers and missing `fileId` */
	mocks.api.post('/b2api/v2/b2_finish_large_file', body => !body.fileId).matchHeader('authorization', config.auth.buckets.authToken).reply(function() {
		return [
			400,
			{
				code: 'bad_request',
				message: 'required field fileId is missing',
				status: 400,
			},
		];
	});

	/* finish large file with valid headers and a `partSha1Array` the real API would reject */
	mocks.api.post('/b2api/v2/b2_finish_large_file', function(body) {
		if (!Array.isArray(body.partSha1Array) || body.partSha1Array.length === 0) {
			return true;
		}
		// every part must be present, a string, and in ascending part order
		return body.partSha1Array.some((sha, index) => sha !== config.partSha1(index + 1));
	}).matchHeader('authorization', config.auth.buckets.authToken).reply(function(uri, body) {
		return [
			400,
			{
				code: 'bad_request',
				message: 'partSha1Array must list every part sha1 in order, got ' + JSON.stringify(body.partSha1Array),
				status: 400,
			},
		];
	});

	/* finish large file with valid headers and valid params, and good permissions */
	mocks.api.post('/b2api/v2/b2_finish_large_file').matchHeader('authorization', config.auth.buckets.authToken).reply(function(uri, body) {
		return [
			200,
			{
				accountId: config.auth.buckets.accountId,
				action: 'upload',
				bucketId: config.bucketId,
				contentSha1: 'none',
				contentType: config.file.largeCopy.contentType,
				fileId: body.fileId,
				fileName: config.file.largeCopy.fileName,
				// not a real B2 field, echoed so tests can assert every part was copied
				partCount: body.partSha1Array.length,
				uploadTimestamp: config.file.largeCopy.uploadTimestamp,
			},
		];
	});
};
