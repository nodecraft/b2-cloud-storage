'use strict';
const assert = require('assert');
const b2CloudStorage = require('..');

const config = require('./lib/config.js');

require('./lib/mock-server.js'); // mock b2 api server

describe('b2_delete_key', function(){
	it('fails with missing `applicationKeyId', function(done){
		const b2 = new b2CloudStorage({auth: {accountId: config.auth.buckets.accountId, applicationKey: config.auth.buckets.applicationKey}});
		b2.authorize((err) => {
			if(err){ return done(err); }
			b2.deleteKey(undefined,
				function(err){
					assert(err instanceof Error);
					assert.strictEqual(err.message, 'required field applicationKeyId is missing');
					done();
				});
		});
	});

	it('fails with credentials that don\'t have valid capabilities', function(done){
		const b2 = new b2CloudStorage({auth: {accountId: config.auth.none.accountId, applicationKey: config.auth.none.applicationKey}});
		b2.authorize((err) => {
			if(err){ return done(err); }
			b2.deleteKey(config.auth.none.applicationKeyId,
				function(err, results){
					assert(err instanceof Error);
					assert.strictEqual(results.code, 'unauthorized');
					done();
				});
		});
	});

	it('succeeds with valid credentials and params', function(done){
		const b2 = new b2CloudStorage({auth: {accountId: config.auth.buckets.accountId, applicationKey: config.auth.buckets.applicationKey}});
		b2.authorize((err) => {
			if(err){ return done(err); }
			b2.deleteKey(config.auth.buckets.applicationKeyId, done);
		});
	});
});