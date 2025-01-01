'use strict';
const assert = require('node:assert');

const b2CloudStorage = require('..');
const config = require('./lib/config.js');

require('./lib/mock-server.js'); // mock b2 api server

describe('b2_create_key', function() {
	it('fails with missing `capabilities', function(done) {
		const b2 = new b2CloudStorage({ auth: { accountId: config.auth.buckets.accountId, applicationKey: config.auth.buckets.applicationKey } });
		b2.authorize((err) => {
			if (err) { return done(err); }
			b2.createKey({}, function(err) {
				assert(err instanceof Error);
				assert.strictEqual(err.message, 'required field capabilities is missing');
				done();
			});
		});
	});

	it('fails with missing `keyName`', function(done) {
		const b2 = new b2CloudStorage({ auth: { accountId: config.auth.buckets.accountId, applicationKey: config.auth.buckets.applicationKey } });
		b2.authorize((err) => {
			if (err) { return done(err); }
			b2.createKey({
				capabilities: config.auth.buckets.capabilities,
			}, function(err) {
				assert(err instanceof Error);
				assert.strictEqual(err.message, 'required field keyName is missing');
				done();
			});
		});
	});

	it('fails with credentials that don\'t have valid capabilities', function(done) {
		const b2 = new b2CloudStorage({ auth: { accountId: config.auth.none.accountId, applicationKey: config.auth.none.applicationKey } });
		b2.authorize((err) => {
			if (err) { return done(err); }
			b2.createKey({
				capabilities: config.auth.none.capabilities,
				keyName: config.auth.none.keyName,
			}, function(err, results) {
				assert(err instanceof Error);
				assert.strictEqual(results.code, 'unauthorized');
				done();
			});
		});
	});

	it('succeeds with valid credentials and params', function(done) {
		const b2 = new b2CloudStorage({ auth: { accountId: config.auth.buckets.accountId, applicationKey: config.auth.buckets.applicationKey } });
		b2.authorize((err) => {
			if (err) { return done(err); }
			b2.createKey({
				capabilities: config.auth.buckets.capabilities,
				keyName: config.auth.buckets.keyName,
			}, done);
		});
	});
});
