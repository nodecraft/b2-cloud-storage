'use strict';
const assert = require('node:assert');

const b2CloudStorage = require('..');
const config = require('./lib/config.js');

require('./lib/mock-server.js'); // mock b2 api server

const auth = { accountId: config.auth.buckets.accountId, applicationKey: config.auth.buckets.applicationKey };
const partSize = 5_000_000;

// `copyFile` only needs `b2_get_file_info` when the source metadata isn't supplied, so pass it all through
function copyLarge(b2, size, callback) {
	return b2.copyFile({
		sourceFileId: config.file.source.fileId,
		fileName: config.file.largeCopy.fileName,
		destinationBucketId: config.bucketId,
		contentType: config.file.largeCopy.contentType,
		hash: config.file.source.contentSha1,
		size,
		partSize,
	}, callback);
}

describe('copyFile large file', function() {
	it('copies every part when the size is an exact multiple of the part size', function(done) {
		const b2 = new b2CloudStorage({ auth, maxSmallCopyFileSize: partSize });
		b2.authorize(function(err) {
			if (err) { return done(err); }
			// a stalled copy part queue never calls back at all, so this times out rather than erroring
			return copyLarge(b2, partSize * 5, function(err, results) {
				if (err) { return done(err); }
				assert.strictEqual(results.fileId, config.file.largeCopy.fileId);
				assert.strictEqual(results.partCount, 5);
				return done();
			});
		});
	});

	it('copies every part when the last part is a remainder', function(done) {
		const b2 = new b2CloudStorage({ auth, maxSmallCopyFileSize: partSize });
		b2.authorize(function(err) {
			if (err) { return done(err); }
			return copyLarge(b2, (partSize * 4) + 1234, function(err, results) {
				if (err) { return done(err); }
				assert.strictEqual(results.partCount, 5);
				return done();
			});
		});
	});

	it('copies in a single request when the file is under the chunking threshold', function(done) {
		const b2 = new b2CloudStorage({ auth });
		b2.authorize(function(err) {
			if (err) { return done(err); }
			return b2.copyFile({
				sourceFileId: config.file.source.fileId,
				fileName: config.file.destination.fileName,
				destinationBucketId: config.bucketId,
				contentType: config.file.source.contentType,
				hash: config.file.source.contentSha1,
				size: config.file.source.contentLength,
			}, function(err, results) {
				if (err) { return done(err); }
				// `b2_copy_file`, not a large file, so there is no part count
				assert.strictEqual(results.partCount, undefined);
				return done();
			});
		});
	});
});
