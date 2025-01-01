'use strict';
const assert = require('node:assert');

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
});
