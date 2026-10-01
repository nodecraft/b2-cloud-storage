'use strict';
const assert = require('node:assert');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const nock = require('nock');

const b2CloudStorage = require('..');

require('./lib/mock-server.js'); // disables real network access

// dedicated hosts keep these interceptors separate from the shared persisted mocks
const apiUrl = 'https://api-upload-test.backblazeb2.com';
const uploadHost = 'https://pod-upload-test.backblazeb2.com';
const bucketId = 'upload-test-bucket';

describe('uploadFile', function() {
	let tmpDir = null;
	let smallFile = null;
	let state = null;

	before(function() {
		tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'b2-upload-test-'));
		smallFile = path.join(tmpDir, 'small.txt');
		fs.writeFileSync(smallFile, crypto.randomBytes(1000).toString('hex'));

		const api = nock(apiUrl).persist();
		api.post('/b2api/v2/b2_get_upload_url').reply(function() {
			state.uploadUrlCalls++;
			return [200, { bucketId, uploadUrl: uploadHost + '/b2api/v2/b2_upload_file', authorizationToken: 'upload-token-' + state.uploadUrlCalls }];
		});

		const upload = nock(uploadHost).persist();
		upload.post('/b2api/v2/b2_upload_file').reply(function(uri, body) {
			state.uploads.push({ headers: this.req.headers, body });
			if (state.failUploads > 0) {
				state.failUploads--;
				return [503, { status: 503, code: 'service_unavailable', message: 'busy' }];
			}
			return [200, { fileId: 'small-file-id', contentSha1: this.req.headers['x-bz-content-sha1'] }];
		});
	});

	beforeEach(function() {
		state = { uploadUrlCalls: 0, uploads: [], failUploads: 0 };
	});

	after(function() {
		fs.rmSync(tmpDir, { recursive: true, force: true });
	});

	function createClient(options) {
		const b2 = new b2CloudStorage({ auth: { accountId: 'id', applicationKey: 'key' }, ...options });
		b2.authData = { accountId: 'id', authorizationToken: 'token', apiUrl, recommendedPartSize: 100_000_000 };
		b2.url = apiUrl;
		return b2;
	}

	function uploadSmall(b2, data, callback) {
		return b2.uploadFile(smallFile, { bucketId, fileName: 'small.txt', contentType: 'text/plain', ...data }, callback);
	}

	it('stops retrying a failing small upload after maxPartAttempts', function(done) {
		state.failUploads = Infinity;
		uploadSmall(createClient({ maxPartAttempts: 2 }), {}, function(err) {
			assert(err, 'expected the upload to fail');
			assert.strictEqual(state.uploads.length, 3);
			return done();
		});
	});

	it('honours a per-upload maxPartAttempts override', function(done) {
		state.failUploads = Infinity;
		uploadSmall(createClient(), { maxPartAttempts: 1 }, function(err) {
			assert(err, 'expected the upload to fail');
			assert.strictEqual(state.uploads.length, 2);
			return done();
		});
	});

	it('retries a transient small upload failure and succeeds', function(done) {
		state.failUploads = 1;
		uploadSmall(createClient(), {}, function(err, results) {
			if (err) { return done(err); }
			assert.strictEqual(results.fileId, 'small-file-id');
			assert.strictEqual(state.uploads.length, 2);
			return done();
		});
	});
});
