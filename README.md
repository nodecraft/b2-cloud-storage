# b2-cloud-storage
[![npm version](https://badge.fury.io/js/b2-cloud-storage.svg)](https://badge.fury.io/js/b2-cloud-storage)
[![dependencies Status](https://david-dm.org/nodecraft/b2-cloud-storage/status.svg)](https://david-dm.org/nodecraft/b2-cloud-storage)
[![Actions Status](https://github.com/nodecraft/b2-cloud-storage/workflows/Test/badge.svg)](https://github.com/nodecraft/b2-cloud-storage/actions)
[![FOSSA Status](https://app.fossa.io/api/projects/git%2Bgithub.com%2Fnodecraft%2Fb2-cloud-storage.svg?type=shield)](https://app.fossa.io/projects/git%2Bgithub.com%2Fnodecraft%2Fb2-cloud-storage?ref=badge_shield)

Backblaze B2 Cloud Storage API Client

**This module is still in development and not recommended for production use yet.**

## Basic Example

```javascript
'use strict';
const b2CloudStorage = require('b2-cloud-storage');

const b2 = new b2CloudStorage({
	auth: {
		accountId: '<accountId>', // NOTE: This is the accountId unique to the key
		applicationKey: '<applicationKey>'
	}
});

b2.authorize(function(err){
	if(err){ throw err; }

	// this function wraps both a normal upload AND a large file upload
	b2.uploadFile('/path/to/file.zip', {
		bucketId: '<bucketId>',
		fileName: 'file.zip', // this is the object storage "key". Can include a full path
		contentType: 'application/zip',
		onUploadProgress: function(update){
			console.log(`Progress: ${update.percent}% (${update.bytesDispatched}/${update.bytesTotal}`);
			// output: Progress: 9% 9012/100024
		}
	}, function(err, results){
		// handle callback
	});
});
```


## Documentation
You can read the [full documentation here](docs.md).

## Roadmap:
 - [ ] Add unit tests and code coverage
 - [x] Add retries to small file uploads
 - [ ] Add helper methods to delete all file versions for a single file
 - [ ] Add helper methods to better query paginated search
 - [x] Automatically handle auth token expiration


## License
[![FOSSA Status](https://app.fossa.io/api/projects/git%2Bgithub.com%2Fnodecraft%2Fb2-cloud-storage.svg?type=large)](https://app.fossa.io/projects/git%2Bgithub.com%2Fnodecraft%2Fb2-cloud-storage?ref=badge_large) [![Greenkeeper badge](https://badges.greenkeeper.io/nodecraft/b2-cloud-storage.svg)](https://greenkeeper.io/)
