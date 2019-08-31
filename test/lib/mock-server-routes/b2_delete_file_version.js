'use strict';
module.exports = function(mocks, config){
	/* delete file version with invalid headers */
	mocks.api.post('/b2api/v2/b2_delete_file_version').matchHeader('authorization', function(val){
		return val !== config.auth.all.authToken && val !== config.auth.buckets.authToken && val !== config.auth.none.authToken;
	}).reply(401, {code: 'bad_auth_token', message: '', status: 401});

	/* create bucket with valid headers and missing `fileName` */
	mocks.api.post('/b2api/v2/b2_delete_file_version', body=> !body.fileName).matchHeader('authorization', config.auth.buckets.authToken).reply(function(){
		return [
			400,
			{
				code: 'bad_request',
				message: 'required field fileName is missing',
				status: 400
			}
		];
	});

	/* delete file version with valid headers and missing `fileId` */
	mocks.api.post('/b2api/v2/b2_delete_file_version', {
		fileName: config.file.source.fileName
	}).matchHeader('authorization', config.auth.buckets.authToken).reply(function(){
		return [
			400,
			{
				code: 'bad_request',
				message: 'required field fileId is missing',
				status: 400
			}
		];
	});

	/* delete file version with valid headers and valid params, but bad permissions */
	mocks.api.post('/b2api/v2/b2_delete_file_version', {
		fileName: config.file.source.fileName,
		fileId: config.file.source.fileId
	}).matchHeader('authorization', config.auth.none.authToken).reply(function(){
		return [
			401,
			config.responses.unauthorized
		];
	});

	/* delete file version with valid headers and valid params, and good permissions */
	mocks.api.post('/b2api/v2/b2_delete_file_version', {
		fileName: config.file.source.fileName,
		fileId: config.file.source.fileId
	}).matchHeader('authorization', config.auth.buckets.authToken).reply(function(){
		return [
			200,
			{
				fileName: config.file.source.fileName,
				fileId: config.file.source.fileId
			}
		];
	});
};