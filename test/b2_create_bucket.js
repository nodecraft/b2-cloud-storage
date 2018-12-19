'use strict';
const assert = require('assert');
const b2CloudStorage = require('..');

const config = require('./lib/config.js');

require('./lib/mock-server.js'); // mock b2 api server

describe('b2_create_bucket', function(){
	it('fails with missing `bucketName', function(done){
		const b2 = new b2CloudStorage({auth: {accountId: config.auth.buckets.accountId, applicationKey: config.auth.buckets.applicationKey}});
		b2.authorize((err) => {
			if(err){ return done(err); }
			b2.createBucket({}, function(err){
				assert(err instanceof Error);
				assert.strictEqual(err.message, 'required field bucketName is missing');
				done();
			});
		});
	});

	it('fails with missing `bucketType`', function(done){
		const b2 = new b2CloudStorage({auth: {accountId: config.auth.buckets.accountId, applicationKey: config.auth.buckets.applicationKey}});
		b2.authorize((err) => {
			if(err){ return done(err); }
			b2.createBucket({
				bucketName: config.bucketName
			}, function(err){
				assert(err instanceof Error);
				assert.strictEqual(err.message, 'required field bucketType is missing');
				done();
			});
		});
	});

	it('fails with credentials that don\'t have valid capabilities', function(done){
		const b2 = new b2CloudStorage({auth: {accountId: config.auth.none.accountId, applicationKey: config.auth.none.applicationKey}});
		b2.authorize((err) => {
			if(err){ return done(err); }
			b2.createBucket({
				bucketName: config.bucketName,
				bucketType: config.bucketType
			}, function(err, results){
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
			b2.createBucket({
				bucketName: config.bucketName,
				bucketType: config.bucketType
			}, done);
		});
	});
});