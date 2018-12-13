# b2-cloud-storage
Backblaze B2 Cloud Storage API Client

**This module is still in development and not recommended for production use yet.**

## Basic Example

```javascript

const b2CloudStorage = require('b2-cloud-storage');

const b2 = new b2CloudStorage({
	accountId: '<accountId>' // NOTE: This is the accountId unique to the key
	applicationKey: '<applicationKey>'
});

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
```


## Documentation
You can read get the [full documentation here](docs.md).

## Roadmap:
 - [ ] Add unit tests and code coverage
 - [ ] Add retries to small file uploads
 - [ ] Add helper methods to delete all file versions for a single file
 - [ ] Add helper methods to better query paginated search
 - 