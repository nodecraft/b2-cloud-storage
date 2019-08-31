'use strict';
const assert = require('assert');
const b2CloudStorage = require('..');

const config = require('./lib/config.js');

require('./lib/mock-server.js'); // mock b2 api server

describe('b2_get_download_authorization', function(){
	it('fails with missing `bucketId', function(done){
		const b2 = new b2CloudStorage({auth: {accountId: config.auth.all.accountId, applicationKey: config.auth.all.applicationKey}});
		b2.authorize((err) => {
			if(err){ return done(err); }
			b2.getDownloadAuthorization({}, function(err){
				assert(err instanceof Error);
				assert.strictEqual(err.message, 'required field bucketId is missing');
				done();
			});
		});
	});

	it('fails with missing `fileNamePrefix`', function(done){
		const b2 = new b2CloudStorage({auth: {accountId: config.auth.all.accountId, applicationKey: config.auth.all.applicationKey}});
		b2.authorize((err) => {
			if(err){ return done(err); }
			b2.getDownloadAuthorization({
				bucketId: config.bucketId
			}, function(err){
				assert(err instanceof Error);
				assert.strictEqual(err.message, 'required field fileNamePrefix is missing');
				done();
			});
		});
	});

	it('fails with missing `validDurationInSeconds`', function(done){
		const b2 = new b2CloudStorage({auth: {accountId: config.auth.all.accountId, applicationKey: config.auth.all.applicationKey}});
		b2.authorize((err) => {
			if(err){ return done(err); }
			b2.getDownloadAuthorization({
				bucketId: config.bucketId,
				fileNamePrefix: config.file.source.fileName
			}, function(err){
				assert(err instanceof Error);
				assert.strictEqual(err.message, 'required field validDurationInSeconds is missing');
				done();
			});
		});
	});

	it('fails with credentials that don\'t have valid capabilities', function(done){
		const b2 = new b2CloudStorage({auth: {accountId: config.auth.none.accountId, applicationKey: config.auth.none.applicationKey}});
		b2.authorize((err) => {
			if(err){ return done(err); }
			b2.getDownloadAuthorization({
				bucketId: config.bucketId,
				fileNamePrefix: config.file.source.fileName,
				validDurationInSeconds: 10
			}, function(err, results){
				assert(err instanceof Error);
				assert.strictEqual(results.code, 'unauthorized');
				done();
			});
		});
	});

	it('succeeds with valid credentials and params', function(done){
		const b2 = new b2CloudStorage({auth: {accountId: config.auth.all.accountId, applicationKey: config.auth.all.applicationKey}});
		b2.authorize((err) => {
			if(err){ return done(err); }
			b2.getDownloadAuthorization({
				bucketId: config.bucketId,
				fileNamePrefix: config.file.source.fileName,
				validDurationInSeconds: 10
			}, done);
		});
	});
});