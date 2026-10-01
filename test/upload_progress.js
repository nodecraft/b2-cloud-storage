'use strict';
const assert = require('node:assert');
const crypto = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');

const nock = require('nock');

const b2CloudStorage = require('..');

require('./lib/mock-server.js'); // disables real network access

const bucketId = 'progress-test-bucket';
const holdMs = 100;

// a real server (not nock) so keep-alive sockets are reused across requests, which is what broke progress
describe('upload progress', function() {
	let tmpDir = null;
	let server = null;
	let baseUrl = null;
	let state = null;

	before(function(done) {
		tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'b2-progress-test-'));
		nock.enableNetConnect('127.0.0.1');
		server = http.createServer(function(req, res) {
			const chunks = [];
			req.on('data', chunk => chunks.push(chunk));
			req.on('end', function() {
				const body = Buffer.concat(chunks);
				const name = req.url.split('/').pop();
				let reply = {};
				if (name === 'b2_get_upload_url') {
					reply = { uploadUrl: baseUrl + '/upload_file', authorizationToken: 'upload-token' };
				} else if (name === 'b2_start_large_file') {
					reply = { fileId: 'large-file-id' };
				} else if (name === 'b2_get_upload_part_url') {
					reply = { uploadUrl: baseUrl + '/upload_part', authorizationToken: 'part-token' };
				} else if (name === 'b2_finish_large_file') {
					reply = { fileId: 'large-file-id' };
				} else if (name === 'upload_file' || name === 'upload_part') {
					state.uploadCount++;
					reply = { fileId: 'file-id', contentSha1: 'unverified:' + crypto.createHash('sha1').update(body).digest('hex') };
				}
				const respond = function() {
					state.holding = false;
					res.writeHead(200, { 'Content-Type': 'application/json' });
					res.end(JSON.stringify(reply));
				};
				// hold the chosen upload's response after its whole body arrived, so progress at that moment is known exactly
				if (state.uploadCount > 0 && state.uploadCount === state.holdUpload && name.startsWith('upload_')) {
					state.holding = true;
					return setTimeout(respond, holdMs);
				}
				return respond();
			});
		});
		server.listen(0, '127.0.0.1', function() {
			baseUrl = 'http://127.0.0.1:' + server.address().port;
			done();
		});
	});

	beforeEach(function() {
		state = { uploadCount: 0, holdUpload: 0, holding: false };
	});

	after(function(done) {
		nock.disableNetConnect();
		fs.rmSync(tmpDir, { recursive: true, force: true });
		server.closeAllConnections();
		server.close(done);
	});

	function createClient() {
		const b2 = new b2CloudStorage({ auth: { accountId: 'id', applicationKey: 'key' } });
		b2.authData = { accountId: 'id', authorizationToken: 'token', apiUrl: baseUrl, recommendedPartSize: 100_000_000 };
		b2.url = baseUrl;
		return b2;
	}

	function writeFile(name, size) {
		const file = path.join(tmpDir, name);
		fs.writeFileSync(file, crypto.randomBytes(size));
		return file;
	}

	it('reports only the current file for small uploads on a reused connection', function(done) {
		const size = 2_000_000;
		const file = writeFile('small.bin', size);
		const b2 = createClient();
		const upload = function(callback) {
			const heldSamples = [];
			b2.uploadFile(file, {
				bucketId,
				fileName: 'small.bin',
				contentType: 'application/octet-stream',
				hash: false,
				progressInterval: 10,
				onUploadProgress: function(progress) {
					assert(progress.percent <= 100, 'progress exceeded 100%: ' + progress.percent);
					if (state.holding) {
						heldSamples.push(progress.bytesDispatched);
					}
				},
			}, function(err) {
				return callback(err, heldSamples);
			});
		};
		state.holdUpload = 1;
		upload(function(err) {
			if (err) { return done(err); }
			// the second upload reuses the first upload's keep-alive socket
			state.uploadCount = 0;
			upload(function(err, heldSamples) {
				if (err) { return done(err); }
				assert(heldSamples.length > 0, 'expected progress samples while the response was held');
				for (const bytes of heldSamples) {
					assert.strictEqual(bytes, size);
				}
				return done();
			});
		});
	});

	it('counts each large file part once when parts share a connection', function(done) {
		const partSize = 1_000_000;
		const file = writeFile('large.bin', partSize * 4);
		const heldSamples = [];
		let handleProgress = null;
		state.holdUpload = 2;
		// one upload URL so every part goes over the same keep-alive socket
		const handle = createClient().uploadFileLarge(file, {
			bucketId,
			fileName: 'large.bin',
			contentType: 'application/octet-stream',
			partSize,
			size: partSize * 4,
			stat: fs.statSync(file),
			limit: 1,
			progressInterval: 10,
			onUploadProgress: function(progress) {
				if (state.holding) {
					heldSamples.push(progress.bytesDispatched);
					handleProgress = handle.progress();
				}
			},
		}, function(err) {
			if (err) { return done(err); }
			assert(heldSamples.length > 0, 'expected progress samples while the response was held');
			// part 1 is finished and part 2 is fully sent but not yet acknowledged
			for (const bytes of heldSamples) {
				assert.strictEqual(bytes, partSize * 2);
			}
			assert.deepStrictEqual(handleProgress, { percent: 50, bytesDispatched: partSize * 2, bytesTotal: partSize * 4 });
			return done();
		});
	});
});
