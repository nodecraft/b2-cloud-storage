'use strict';
module.exports = function(mocks, config){
	/* copy part with invalid headers */
	mocks.api.post('/b2api/v2/b2_copy_part').matchHeader('authorization', function(val){
		return val !== config.auth.all.authToken && val !== config.auth.buckets.authToken && val !== config.auth.none.authToken;
	}).reply(401, {code: 'bad_auth_token', message: '', status: 401});

	/* copy part with valid headers and missing `sourceFileId` */
	mocks.api.post('/b2api/v2/b2_copy_part', body => !body.sourceFileId).matchHeader('authorization', config.auth.buckets.authToken).reply(function(){
		return [
			400,
			{
				code: 'bad_request',
				message: 'required field sourceFileId is missing',
				status: 400,
			},
		];
	});

	/* copy part with valid headers and missing `largeFileId` */
	mocks.api.post('/b2api/v2/b2_copy_part', {
		sourceFileId: config.file.source.fileId,
	}).matchHeader('authorization', config.auth.buckets.authToken).reply(function(){
		return [
			400,
			{
				code: 'bad_request',
				message: 'required field largeFileId is missing',
				status: 400,
			},
		];
	});

	/* copy part with valid headers and missing `partNumber` */
	mocks.api.post('/b2api/v2/b2_copy_part', {
		sourceFileId: config.file.source.fileId,
		largeFileId: config.file.destination.fileId,
	}).matchHeader('authorization', config.auth.buckets.authToken).reply(function(){
		return [
			400,
			{
				code: 'bad_request',
				message: 'required field partNumber is missing',
				status: 400,
			},
		];
	});

	/* copy part with valid headers and valid params, but bad permissions */
	mocks.api.post('/b2api/v2/b2_copy_part', {
		sourceFileId: config.file.source.fileId,
		largeFileId: config.file.destination.fileId,
		partNumber: 1,
	}).matchHeader('authorization', config.auth.none.authToken).reply(function(){
		return [
			401,
			config.responses.unauthorized,
		];
	});

	/* copy part with valid headers and valid params, and good permissions */
	mocks.api.post('/b2api/v2/b2_copy_part', {
		sourceFileId: config.file.source.fileId,
		largeFileId: config.file.destination.fileId,
		partNumber: 1,
	}).matchHeader('authorization', config.auth.buckets.authToken).reply(function(){
		return [
			200,
			{
				fileId: config.file.destination.fileId,
				partNumber: config.file.destination.partNumber,
				contentLength: config.file.destination.contentLength,
				contentSha1: config.file.destination.contentSha1,
				uploadTimestamp: config.file.destination.uploadTimestamp,
			},
		];
	});
};