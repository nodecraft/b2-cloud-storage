'use strict';
const fs = require('node:fs');
const path = require('node:path');

const nock = require('nock');

const config = require('./config.js');
console.log('Mocking B2 API server...');

const mocks = {
	raw: nock('https://api.backblazeb2.com').persist(),
	api: nock('https://api001.backblazeb2.com').persist(),
};
for (const file of fs.readdirSync(__dirname + '/mock-server-routes')) {
	if (path.extname(file) !== '.js') { continue; }
	console.log('Mocking', path.basename(file, '.js'));
	require(__dirname + '/mock-server-routes/' + file)(mocks, config);
}

nock.disableNetConnect(); // disable all other network requests

console.log('Done mocking.');
module.exports = mocks;
