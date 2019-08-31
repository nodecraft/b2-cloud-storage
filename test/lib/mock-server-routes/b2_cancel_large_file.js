'use strict';
module.exports = function(mocks, config){
	/* cancel large file with invalid headers */
	mocks.api.post('/b2api/v2/b2_cancel_large_file').matchHeader('authorization', function(val){
		return val !== config.auth.all.authToken && val !== config.auth.buckets.authToken && val !== config.auth.none.authToken;
	}).reply(401, {code: 'bad_auth_token', message: '', status: 401});

	/* cancel large file with valid headers and missing `fileId` */
	mocks.api.post('/b2api/v2/b2_cancel_large_file', body=> !body.fileId).matchHeader('authorization', config.auth.all.authToken).reply(function(){
		return [
			400,
			{
				code: 'bad_request',
				message: 'required field fileId is missing',
				status: 400
			}
		];
	});

	/* cancel large file with valid headers and valid params, but bad permissions */
	mocks.api.post('/b2api/v2/b2_cancel_large_file', {
		fileId: config.file.source.fileId
	}).matchHeader('authorization', config.auth.none.authToken).reply(function(){
		return [
			401,
			config.responses.unauthorized
		];
	});

	/* cancel large file with valid headers and valid params, and good permissions */
	mocks.api.post('/b2api/v2/b2_cancel_large_file', {
		fileId: config.file.source.fileId
	}).matchHeader('authorization', config.auth.all.authToken).reply(function(){
		return [
			200,
			{
				accountId: config.auth.buckets.accountId,
				bucketId: config.bucketId,
				fileId: config.fileId,
				fileName: config.fileName
			}
		];
	});
};