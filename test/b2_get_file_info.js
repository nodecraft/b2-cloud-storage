'use strict';
const assert = require('node:assert');

const b2CloudStorage = require('..');
const config = require('./lib/config.js');

require('./lib/mock-server.js'); // mock b2 api server

describe('b2_get_file_info', function() {
	it('fails with missing `fileId', function(done) {
		const b2 = new b2CloudStorage({ auth: { accountId: config.auth.all.accountId, applicationKey: config.auth.all.applicationKey } });
		b2.authorize((err) => {
			if (err) { return done(err); }
			b2.getFileInfo(undefined, function(err) {
				assert(err instanceof Error);
				assert.strictEqual(err.message, 'required field fileId is missing');
				done();
			});
		});
	});


	it('fails with credentials that don\'t have valid capabilities', function(done) {
		const b2 = new b2CloudStorage({ auth: { accountId: config.auth.none.accountId, applicationKey: config.auth.none.applicationKey } });
		b2.authorize((err) => {
			if (err) { return done(err); }
			b2.getFileInfo(config.file.source.fileId,
				function(err, results) {
					assert(err instanceof Error);
					assert.strictEqual(results.code, 'unauthorized');
					done();
				});
		});
	});

	it('succeeds with valid credentials and params', function(done) {
		const b2 = new b2CloudStorage({ auth: { accountId: config.auth.all.accountId, applicationKey: config.auth.all.applicationKey } });
		b2.authorize((err) => {
			if (err) { return done(err); }
			b2.getFileInfo(config.file.source.fileId, done);
		});
	});
});
