'use strict';
const config = {
	auth: {
		all: {
			keyName: 'mock-key-name-all',
			applicationKeyId: 'mock-application-key-id-all',
			accountId: 'mock-accountId-123456',
			applicationKey: 'mock-applicationKey-abcdefg',
			responseAccountId: 'mock-responseAccountId-123456',
			capabilities: ["listKeys", "writeKeys", "deleteKeys", "listBuckets", "writeBuckets", "deleteBuckets", "listFiles", "readFiles", "shareFiles", "writeFiles", "deleteFiles"],
			authToken: 'mock-token-all'
		},
		buckets: {
			keyName: 'mock-key-name-buckets',
			applicationKeyId: 'mock-application-key-id-buckets',
			accountId: 'mock-accountId-buckets-123456',
			applicationKey: 'mock-applicationKey-buckets--abcdefg',
			responseAccountId: 'mock-responseAccountId-buckets-123456',
			capabilities: ["listBuckets", "writeBuckets", "deleteBuckets"],
			authToken: 'mock-token-buckets'
		},
		none: { // technically not possible, but useful for testing
			keyName: 'mock-key-name-none',
			applicationKeyId: 'mock-application-key-id-none',
			accountId: 'mock-accountId-none-123456',
			applicationKey: 'mock-applicationKey-none--abcdefg',
			responseAccountId: 'mock-responseAccountId-none-123456',
			capabilities: [],
			authToken: 'mock-token-none'
		}
	},
	authHeaders: [],
	bucketId: 'mock-bucket-id',
	bucketName: 'mock-bucket-name',
	bucketType: 'allPublic',
	file: {
		source: {
			contentLength: 7,
			contentSha1: "dc724af18fbdd4e59189f5fe768a5f8311527050",
			contentType: "text/plain",
			fileId: "4_zb2f6f21365e1d29f6c580f18_f10904e5ca06493a1_d20180914_m223119_c002_v0001094_t0002",
			fileInfo: {
				src_last_modified_millis: "1536964184056"
			},
			fileName: "testing.txt",
			uploadTimestamp: 1536964279000

		},
		destination: {
			contentLength: 8,
			contentSha1: "596b29ec9afea9e461a20610d150939b9c399d93",
			contentType: "text/plain",
			fileId: "4_zb2f6f21365e1d29f6c580f18_f10076875fe98d4af_d20180914_m223128_c002_v0001108_t0050",
			fileInfo: {
				src_last_modified_millis: "1536964200750"
			},
			fileName: "testing2.txt",
			uploadTimestamp: 1536964288000
		}
	},
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