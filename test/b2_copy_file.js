'use strict';
const assert = require('assert');
const b2CloudStorage = require('..');

const config = require('./lib/config.js');

require('./lib/mock-server.js'); // mock b2 api server

describe('b2_copy_file', function(){
	it('fails with missing `sourceFileId', function(done){
		const b2 = new b2CloudStorage({auth: {accountId: config.auth.buckets.accountId, applicationKey: config.auth.buckets.applicationKey}});
		b2.authorize((err) => {
			if(err){ return done(err); }
			b2.copySmallFile({}, function(err){
				assert(err instanceof Error);
				assert.strictEqual(err.message, 'required field sourceFileId is missing');
				done();
			});
		});
	});

	it('fails with missing `fileName`', function(done){
		const b2 = new b2CloudStorage({auth: {accountId: config.auth.buckets.accountId, applicationKey: config.auth.buckets.applicationKey}});
		b2.authorize((err) => {
			if(err){ return done(err); }
			b2.copySmallFile({
				sourceFileId: config.file.source.fileId
			}, function(err){
				assert(err instanceof Error);
				assert.strictEqual(err.message, 'required field fileName is missing');
				done();
			});
		});
	});

	it('fails with credentials that don\'t have valid capabilities', function(done){
		const b2 = new b2CloudStorage({auth: {accountId: config.auth.none.accountId, applicationKey: config.auth.none.applicationKey}});
		b2.authorize((err) => {
			if(err){ return done(err); }
			b2.copySmallFile({
				sourceFileId: config.file.source.fileId,
				fileName: config.file.destination.fileName
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
			b2.copySmallFile({
				sourceFileId: config.file.source.fileId,
				fileName: config.file.destination.fileName
			}, done);
		});
	});
});