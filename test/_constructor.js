'use strict';
const assert = require('node:assert');
const os = require('node:os');

const b2CloudStorage = require('..');

require('./lib/mock-server.js'); // mock b2 api server

describe('b2CloudStorage', function() {
	it('fails without configuration', function() {
		assert.throws(() => new b2CloudStorage(), Error);
		assert.throws(() => new b2CloudStorage(null), Error);
		assert.throws(() => new b2CloudStorage(undefined), Error);
	});

	it('fails without authentication', function() {
		assert.throws(() => new b2CloudStorage({ foo: 'bar' }), Error);
		assert.throws(() => new b2CloudStorage({ auth: null }), Error);
		assert.throws(() => new b2CloudStorage({ auth: undefined }), Error);
		assert.throws(() => new b2CloudStorage({ auth: { foo: 'bar' } }), Error);
		assert.throws(() => new b2CloudStorage({ auth: { accountId: 'foo' } }), Error);
		assert.throws(() => new b2CloudStorage({ auth: { accountId: null } }), Error);
		assert.throws(() => new b2CloudStorage({ auth: { accountId: 'foo', applicationKey: null } }), Error);
		assert.throws(() => new b2CloudStorage({ auth: { applicationKey: 'foo' } }), Error);
		assert.throws(() => new b2CloudStorage({ auth: { accountId: null, applicationKey: 'foo' } }), Error);
		assert.doesNotThrow(() => new b2CloudStorage({ auth: { accountId: 'bar', applicationKey: 'foo' } }));
	});

	it('fails with invalid `maxSmallFileSize', function() {
		assert.throws(() => new b2CloudStorage({ auth: { accountId: 'bar', applicationKey: 'foo' }, maxSmallFileSize: 99_999_999 }));
		assert.throws(() => new b2CloudStorage({ auth: { accountId: 'bar', applicationKey: 'foo' }, maxSmallFileSize: 5_000_000_001 }));
		assert.doesNotThrow(() => new b2CloudStorage({ auth: { accountId: 'bar', applicationKey: 'foo' }, maxSmallFileSize: 5_000_000_000 }));
		assert.doesNotThrow(() => new b2CloudStorage({ auth: { accountId: 'bar', applicationKey: 'foo' }, maxSmallFileSize: 100_000_000 }));
	});

	it('defaults `maxCopyWorkers` to a usable concurrency', function() {
		const b2 = new b2CloudStorage({ auth: { accountId: 'bar', applicationKey: 'foo' } });
		assert.strictEqual(b2.maxCopyWorkers, os.availableParallelism() * 5);
		// async.queue never starts a worker when concurrency is NaN, which stalls large copies forever
		assert(Number.isInteger(b2.maxCopyWorkers), 'maxCopyWorkers must be an integer');
		assert(b2.maxCopyWorkers >= 1, 'maxCopyWorkers must be at least 1');
	});

	it('fails with invalid `maxCopyWorkers`', function() {
		assert.throws(() => new b2CloudStorage({ auth: { accountId: 'bar', applicationKey: 'foo' }, maxCopyWorkers: 0 }), /maxCopyWorkers/);
		assert.throws(() => new b2CloudStorage({ auth: { accountId: 'bar', applicationKey: 'foo' }, maxCopyWorkers: -1 }), /maxCopyWorkers/);
		assert.throws(() => new b2CloudStorage({ auth: { accountId: 'bar', applicationKey: 'foo' }, maxCopyWorkers: 2.5 }), /maxCopyWorkers/);
		assert.throws(() => new b2CloudStorage({ auth: { accountId: 'bar', applicationKey: 'foo' }, maxCopyWorkers: Number.NaN }), /maxCopyWorkers/);
		assert.throws(() => new b2CloudStorage({ auth: { accountId: 'bar', applicationKey: 'foo' }, maxCopyWorkers: Infinity }), /maxCopyWorkers/);
		assert.doesNotThrow(() => new b2CloudStorage({ auth: { accountId: 'bar', applicationKey: 'foo' }, maxCopyWorkers: 1 }));
	});
});
