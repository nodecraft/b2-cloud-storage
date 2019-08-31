'use strict';
module.exports = function(mocks, config){
	/* get download authorization bucket with invalid headers */
	mocks.api.post('/b2api/v2/b2_get_download_authorization').matchHeader('authorization', function(val){
		return val !== config.auth.all.authToken && val !== config.auth.buckets.authToken && val !== config.auth.none.authToken;
	}).reply(401, {code: 'bad_auth_token', message: '', status: 401});


	/* get download authorization with valid headers and missing `bucketId` */
	mocks.api.post('/b2api/v2/b2_get_download_authorization', body=> !body.bucketId).matchHeader('authorization', config.auth.all.authToken).reply(function(){
		return [
			400,
			{
				code: 'bad_request',
				message: 'required field bucketId is missing',
				status: 400
			}
		];
	});

	/* get download authorization with valid headers and missing `keyName` */
	mocks.api.post('/b2api/v2/b2_get_download_authorization', {
		bucketId: config.bucketId
	}).matchHeader('authorization', config.auth.all.authToken).reply(function(){
		return [
			400,
			{
				code: 'bad_request',
				message: 'required field fileNamePrefix is missing',
				status: 400
			}
		];
	});

	/* get download authorization with valid headers and missing `keyName` */
	mocks.api.post('/b2api/v2/b2_get_download_authorization', {
		bucketId: config.bucketId,
		fileNamePrefix: config.file.source.fileName
	}).matchHeader('authorization', config.auth.all.authToken).reply(function(){
		return [
			400,
			{
				code: 'bad_request',
				message: 'required field validDurationInSeconds is missing',
				status: 400
			}
		];
	});

	/* get download authorization with valid headers and valid params, but bad permissions */
	mocks.api.post('/b2api/v2/b2_get_download_authorization', {
		bucketId: config.bucketId,
		fileNamePrefix: config.file.source.fileName,
		validDurationInSeconds: 10
	}).matchHeader('authorization', config.auth.none.authToken).reply(function(){
		return [
			401,
			config.responses.unauthorized
		];
	});

	/* get download authorization with valid headers and valid params, and good permissions */
	mocks.api.post('/b2api/v2/b2_get_download_authorization', {
		bucketId: config.bucketId,
		fileNamePrefix: config.file.source.fileName,
		validDurationInSeconds: 10
	}).matchHeader('authorization', config.auth.all.authToken).reply(function(){
		return [
			200,
			{
				bucketId: config.bucketId,
				fileNamePrefix: '',
				authorizationToken: 'download_authorization_token'
			}
		];
	});
};