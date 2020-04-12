'use strict';
module.exports = function(mocks, config){
	/* Cancels the upload of a large file, and deletes all of the parts that have been uploaded. */
	mocks.api.post('/b2api/v2/b2_cancel_large_file').matchHeader('authorization', function(val){
		return val !== config.auth.all.authToken && val !== config.auth.buckets.authToken && val !== config.auth.none.authToken;
	}).reply(401, {code: 'bad_auth_token', message: '', status: 401});

	/* Cancels the upload of a large file, and deletes all of the parts that have been uploaded and missing `fileId` */
	mocks.api.post('/b2api/v2/b2_cancel_large_file', body => !body.fileId).matchHeader('authorization', config.auth.all.authToken).reply(function(){
		return [
			400,
			{
				code: 'bad_request',
				message: 'required field fileId is missing',
				status: 400
			}
		];
	});

	/* list unfinished large file swith valid headers and valid params, but bad permissions */
	mocks.api.post('/b2api/v2/b2_cancel_large_file', {
		fileId: config.file.source.fileId
	}).matchHeader('authorization', config.auth.none.authToken).reply(function(){
		return [
			401,
			config.responses.unauthorized
		];
	});

	/* list unfinished large files with valid headers and valid params, and good permissions */
	mocks.api.post('/b2api/v2/b2_cancel_large_file', {
		fileId: config.file.source.fileId
	}).matchHeader('authorization', config.auth.all.authToken).reply(function(){
		return [
			200,
			{
				accountId: config.auth.buckets.accountId,
				bucketId: config.bucketId,
				fileId: config.file.destination.fileId,
				fileName: config.file.destination.fileName
			}
		];
	});
};