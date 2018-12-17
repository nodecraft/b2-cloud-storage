'use strict';
const assert = require('assert');
const b2CloudStorage = require('..');

const config = require('./lib/config.js');

require('./lib/mock-server.js'); // mock b2 api server

describe('b2_authorize_account', function(){
	it('`authorize` fails with invalid authentication', function(done){
		const b2 = new b2CloudStorage({auth: {accountId: 'foo', applicationKey: 'bar'}});
		b2.authorize((err) => {
			assert(err instanceof Error);
			done();
		});
	});

	it('`authorize` succeeds with valid authentication', function(done){
		const b2 = new b2CloudStorage({auth: {accountId: config.accountId, applicationKey: config.applicationKey}});
		b2.authorize(function(err, results){
			if(err){
				return done(err);
			}
			assert.strictEqual(results.authorizationToken, config.authToken);
			done();
		});
	});
});