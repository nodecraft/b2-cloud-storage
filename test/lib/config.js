'use strict';
const config = {
	auth: {
		all: {
			accountId: 'mock-accountId-123456',
			applicationKey: 'mock-accountId-abcdefg',
			responseAccountId: 'mock-responseAccountId-123456',
			capabilities: ["listKeys", "writeKeys", "deleteKeys", "listBuckets", "writeBuckets", "deleteBuckets", "listFiles", "readFiles", "shareFiles", "writeFiles", "deleteFiles"]
		},
		buckets: {
			accountId: 'mock-accountId-buckets-123456',
			applicationKey: 'mock-accountId-buckets--abcdefg',
			responseAccountId: 'mock-responseAccountId-buckets-123456',
			capabilities: ["listBuckets", "writeBuckets", "deleteBuckets"]
		},
		none: { // technically not possible, but useful for testing
			accountId: 'mock-accountId-none-123456',
			applicationKey: 'mock-accountId-none--abcdefg',
			responseAccountId: 'mock-responseAccountId-none-123456',
			capabilities: []
		}
	},
	authHeaders: [],
	authToken: 'mock-token123456',
	bucketId: 'mock-bucket-id',
	bucketName: 'mock-bucket-name',
	bucketType: 'allPublic',
	responses: {
		unauthorized: {
			code: 'unauthorized',
			message: '',
			status: 401
		}
	}
};
// create and store auth headers for testing
for(const authType in config.auth){
	const header = 'Basic ' + Buffer.from(config.auth[authType].accountId + ':' + config.auth[authType].applicationKey).toString('base64');
	config.auth[authType].authHeader = header;
	config.authHeaders.push(header);
}
module.exports = config;