# b2-cloud-storage
[![npm version](https://badge.fury.io/js/b2-cloud-storage.svg)](https://badge.fury.io/js/b2-cloud-storage)
[![dependencies Status](https://david-dm.org/nodecraft/b2-cloud-storage/status.svg)](https://david-dm.org/nodecraft/b2-cloud-storage)
[![Greenkeeper badge](https://badges.greenkeeper.io/nodecraft/b2-cloud-storage.svg)](https://greenkeeper.io/)
[![Actions Status](https://github.com/nodecraft/b2-cloud-storage/workflows/Test/badge.svg)](https://github.com/nodecraft/b2-cloud-storage/actions)
[![FOSSA Status](https://app.fossa.io/api/projects/git%2Bgithub.com%2Fnodecraft%2Fb2-cloud-storage.svg?type=shield)](https://app.fossa.io/projects/git%2Bgithub.com%2Fnodecraft%2Fb2-cloud-storage?ref=badge_shield)

Backblaze B2 Cloud Storage API Client

`b2-cloud-storage` is an API wrapper for all current [Backblaze B2 API](https://www.backblaze.com/b2/docs/) operations. It provides helper methods for uploading files of all sizes, and takes care of the necessary chunking, parting, and API retries that need to happen to ensure files are uploaded successfully.

This module adheres the integration guidelines as published by Backblaze at https://www.backblaze.com/b2/docs/integration_checklist.html.

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
 - [ ] Improve unit tests and code coverage
 - [ ] Add helper methods to delete all file versions for a single file
 - [ ] Add helper methods to better query paginated search


## License
[![FOSSA Status](https://app.fossa.io/api/projects/git%2Bgithub.com%2Fnodecraft%2Fb2-cloud-storage.svg?type=large)](https://app.fossa.io/projects/git%2Bgithub.com%2Fnodecraft%2Fb2-cloud-storage?ref=badge_large)