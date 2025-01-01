'use strict';
module.exports = function(mocks, config) {
	/* list parts with invalid headers */
	mocks.api.post('/b2api/v2/b2_list_parts').matchHeader('authorization', function(val) {
		return val !== config.auth.all.authToken && val !== config.auth.buckets.authToken && val !== config.auth.none.authToken;
	}).reply(401, { code: 'bad_auth_token', message: '', status: 401 });

	/* list parts with valid headers and missing `fileId` */
	mocks.api.post('/b2api/v2/b2_list_parts', body => !body.fileId).matchHeader('authorization', config.auth.all.authToken).reply(function() {
		return [
			400,
			{
				code: 'bad_request',
				message: 'required field fileId is missing',
				status: 400,
			},
		];
	});

	/* list parts with valid headers and valid params, but bad permissions */
	mocks.api.post('/b2api/v2/b2_list_parts', {
		fileId: config.file.source.fileId,
	}).matchHeader('authorization', config.auth.none.authToken).reply(function() {
		return [
			401,
			config.responses.unauthorized,
		];
	});

	/* list parts with valid headers and valid params, and good permissions */
	mocks.api.post('/b2api/v2/b2_list_parts', {
		fileId: config.file.source.fileId,
	}).matchHeader('authorization', config.auth.all.authToken).reply(function() {
		return [
			200,
			{
				nextPartNumber: null,
				parts: [
					{
						contentLength: config.file.source.fileId,
						contentSha1: config.file.source.contentLength,
						fileId: config.file.source.fileId,
						partNumber: 1,
						uploadTimestamp: config.file.source.fileId,
					},
					{
						contentLength: config.file.destination.fileId,
						contentSha1: config.file.destination.contentLength,
						fileId: config.file.destination.fileId,
						partNumber: 2,
						uploadTimestamp: config.file.destination.fileId,
					},
				],
			},
		];
	});
};
