'use strict';
module.exports = function(mocks, config) {
	/* authorize with invalid headers */
	mocks.raw.get('/b2api/v2/b2_authorize_account').matchHeader('authorization', function(val) {
		return !config.authHeaders.includes(val);
	}).reply(401, { code: 'bad_auth_token', message: '', status: 401 });

	/* authorize with valid headers */
	for (const authType in config.auth) {
		mocks.raw.get('/b2api/v2/b2_authorize_account').basicAuth({
			user: config.auth[authType].accountId,
			pass: config.auth[authType].applicationKey,
		}).reply(function() {
			return [
				200,
				{
					absoluteMinimumPartSize: 5_000_000,
					accountId: config.auth[authType].responseAccountId,
					allowed: {
						bucketId: config.bucketId,
						bucketName: config.bucketName,
						capabilities: [
							'listBuckets', 'writeFiles', 'deleteFiles',
						],
						namePrefix: null,
					},
					apiUrl: 'https://api001.backblazeb2.com',
					authorizationToken: config.auth[authType].authToken,
					downloadUrl: 'https://f001.backblazeb2.com',
					recommendedPartSize: 100_000_000,
				},
			];
		});
	}
};
