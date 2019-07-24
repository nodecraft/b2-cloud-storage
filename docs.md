<a name="b2CloudStorage"></a>

## b2CloudStorage
Backblaze B2 Cloud Storage class to handle stream-based uploads and all other API methods.

**Kind**: global class  

* [b2CloudStorage](#b2CloudStorage)
    * [new b2CloudStorage(options)](#new_b2CloudStorage_new)
    * [.authorize([callback])](#b2CloudStorage+authorize)
    * [.uploadFile(filename, data, [callback])](#b2CloudStorage+uploadFile) ⇒ <code>object</code>
    * [.listParts(data, [callback])](#b2CloudStorage+listParts)
    * [.listUnfinishedLargeFiles(data, [callback])](#b2CloudStorage+listUnfinishedLargeFiles)
    * [.getFileInfo(fileId, [callback])](#b2CloudStorage+getFileInfo)
    * [.listBuckets([data], [callback])](#b2CloudStorage+listBuckets)
    * [.copyFilePart(data, [callback])](#b2CloudStorage+copyFilePart)
    * [.copyFile(data, [callback])](#b2CloudStorage+copyFile) ⇒ <code>object</code>
    * [.createBucket(data, [callback])](#b2CloudStorage+createBucket)
    * [.updateBucket(data, [callback])](#b2CloudStorage+updateBucket)
    * [.deleteBucket(data, [callback])](#b2CloudStorage+deleteBucket)
    * [.listFileNames(data, [callback])](#b2CloudStorage+listFileNames)
    * [.listFileVersions(data, [callback])](#b2CloudStorage+listFileVersions)
    * [.listKeys([data], [callback])](#b2CloudStorage+listKeys)
    * [.createKey(data, [callback])](#b2CloudStorage+createKey)
    * [.deleteKey(applicationKeyId, [callback])](#b2CloudStorage+deleteKey)
    * [.deleteFileVersion(data, [callback])](#b2CloudStorage+deleteFileVersion)
    * [.downloadFileById(data, [callback])](#b2CloudStorage+downloadFileById)
    * [.downloadFileByName(data, [callback])](#b2CloudStorage+downloadFileByName)
    * [.getDownloadAuthorization(data, [callback])](#b2CloudStorage+getDownloadAuthorization)
    * [.hideFile(data, [callback])](#b2CloudStorage+hideFile)
    * [.request(data, callback)](#b2CloudStorage+request)
    * [.copySmallFile(data, [callback])](#b2CloudStorage+copySmallFile) ⇒ <code>object</code>
    * [.copyLargeFile(data, [callback])](#b2CloudStorage+copyLargeFile)

<a name="new_b2CloudStorage_new"></a>

### new b2CloudStorage(options)
Creates new instance of the b2CloudStorage class.


| Param | Type | Description |
| --- | --- | --- |
| options | <code>object</code> | Required: Class options to set auth and other options |
| options.auth | <code>object</code> | Authentication object |
| options.auth.accountId | <code>string</code> | Backblaze b2 account ID for the API key. |
| options.auth.applicationKey | <code>string</code> | Backblaze b2 application API key. |
| options.maxSmallFileSize | <code>number</code> | Maximum filesize for the upload to upload as a single upload. Any larger size will be chunked as a Large File upload. |
| options.url | <code>string</code> | URL hostname to use when authenticating to Backblaze B2. This omits `b2api/` and the version from the URI. |
| options.version | <code>string</code> | API version used in the Backblaze B2 url. This follows hthe `b2api/` part of the URI. |
| options.maxPartAttempts | <code>number</code> | Maximum retries each part can reattempt before erroring when uploading a Large File. |
| options.maxTotalErrors | <code>number</code> | Maximum total errors the collective list of file parts can trigger (below the individual maxPartAttempts) before the Large File upload is considered failed. |
| options.maxReauthAttempts | <code>number</code> | Maximum times this library will try to reauthenticate if an auth token expires, before assuming failure. |

<a name="b2CloudStorage+authorize"></a>

### b2CloudStorage.authorize([callback])
`b2_authorize_account` method, required before calling any B2 API routes.

**Kind**: instance method of [<code>b2CloudStorage</code>](#b2CloudStorage)  

| Param | Type |
| --- | --- |
| [callback] | <code>function</code> | 

<a name="b2CloudStorage+uploadFile"></a>

### b2CloudStorage.uploadFile(filename, data, [callback]) ⇒ <code>object</code>
Upload file with `b2_upload_file` or as several parts of a large file upload.This method also will get the filesize & sha1 hash of the entire file.

**Kind**: instance method of [<code>b2CloudStorage</code>](#b2CloudStorage)  
**Returns**: <code>object</code> - Returns an object with 3 helper methods: `cancel()`, `progress()`, & `info()`  

| Param | Type | Description |
| --- | --- | --- |
| filename | <code>String</code> | Path to filename to for upload. |
| data | <code>Object</code> | Configuration data passed from the `uploadFile` method. |
| data.bucketId | <code>String</code> | The target bucket the file is to be uploaded. |
| data.fileName | <code>String</code> | The object keyname that is being uploaded. |
| data.contentType | <code>String</code> | Content/mimetype required for file download. |
| [data.onUploadProgress] | <code>function</code> | Callback function on progress of entire upload |
| [data.progressInterval] | <code>Number</code> | How frequently the `onUploadProgress` callback is fired during upload |
| [data.partSize] | <code>Number</code> | Overwrite the default part size as defined by the b2 authorization process |
| [data.info] | <code>Object</code> | File info metadata for the file. |
| [data.hash] | <code>String</code> | Skips the sha1 hash step with hash already provided. |
| [callback] | <code>function</code> |  |

<a name="b2CloudStorage+listParts"></a>

### b2CloudStorage.listParts(data, [callback])
`b2_list_parts` Lists the parts that have been uploaded for a large file that has not been finished yet.

**Kind**: instance method of [<code>b2CloudStorage</code>](#b2CloudStorage)  

| Param | Type | Description |
| --- | --- | --- |
| data | <code>Object</code> | Message Body Parameters |
| data.fileId | <code>String</code> | The ID returned by `b2_start_large_file`. This is the file whose parts will be listed. |
| [data.startPartNumber] | <code>Number</code> | The first part to return. If there is a part with this number, it will be returned as the first in the list. If not, the returned list will start with the first part number after this one. |
| [data.maxPartCount] | <code>Number</code> | The maximum number of parts to return from this call. The default value is 100, and the maximum allowed is 1000. |
| [callback] | <code>function</code> |  |

<a name="b2CloudStorage+listUnfinishedLargeFiles"></a>

### b2CloudStorage.listUnfinishedLargeFiles(data, [callback])
`b2_list_unfinished_large_files` Lists information about large file uploads that have been started, but have not been finished or canceled.

**Kind**: instance method of [<code>b2CloudStorage</code>](#b2CloudStorage)  

| Param | Type | Description |
| --- | --- | --- |
| data | <code>Object</code> | Message Body Parameters |
| data.bucketId | <code>String</code> | The bucket to look for file names in. |
| [data.namePrefix] | <code>String</code> | When a `namePrefix` is provided, only files whose names match the prefix will be returned. When using an application key that is restricted to a name prefix, you must provide a prefix here that is at least as restrictive. |
| [data.startFileId] | <code>String</code> | The first upload to return. If there is an upload with this ID, it will be returned in the list. If not, the first upload after this the first one after this ID. |
| [data.maxFileCount] | <code>Number</code> | The maximum number of files to return from this call. The default value is 100, and the maximum allowed is 100. |
| [callback] | <code>function</code> |  |

<a name="b2CloudStorage+getFileInfo"></a>

### b2CloudStorage.getFileInfo(fileId, [callback])
`b2_get_file_info` Gets information about one file stored in B2.

**Kind**: instance method of [<code>b2CloudStorage</code>](#b2CloudStorage)  

| Param | Type | Description |
| --- | --- | --- |
| fileId | <code>String</code> | The ID of the file, as returned by `b2_upload_file`, `b2_hide_file`, `b2_list_file_names`, or `b2_list_file_versions`. |
| [callback] | <code>function</code> |  |

<a name="b2CloudStorage+listBuckets"></a>

### b2CloudStorage.listBuckets([data], [callback])
`b2_list_buckets` Lists buckets associated with an account, in alphabetical order by bucket name.

**Kind**: instance method of [<code>b2CloudStorage</code>](#b2CloudStorage)  

| Param | Type | Description |
| --- | --- | --- |
| [data] | <code>Object</code> | Message Body Parameters |
| [data.accountId] | <code>String</code> | The ID of your account. When unset will use the `b2_authorize` results `accountId`. |
| [data.bucketId] | <code>String</code> | When bucketId is specified, the result will be a list containing just this bucket, if it's present in the account, or no buckets if the account does not have a bucket with this ID. |
| [data.bucketTypes] | <code>Array</code> | One of: "allPublic", "allPrivate", "snapshot", or other values added in the future. "allPublic" means that anybody can download the files is the bucket; "allPrivate" means that you need an authorization token to download them; "snapshot" means that it's a private bucket containing snapshots created on the B2 web site. |
| [callback] | <code>function</code> |  |

<a name="b2CloudStorage+copyFilePart"></a>

### b2CloudStorage.copyFilePart(data, [callback])
`b2_copy_part` Creates a new file by copying from an existing file.

**Kind**: instance method of [<code>b2CloudStorage</code>](#b2CloudStorage)  

| Param | Type | Description |
| --- | --- | --- |
| data | <code>Object</code> | Message Body Parameters |
| data.sourceFileId | <code>String</code> | The ID of the source file being copied. |
| data.largeFileId | <code>String</code> | The ID of the large file the part will belong to, as returned by b2_start_large_file. |
| [data.partNumber] | <code>String</code> | A number from 1 to 10000. The parts uploaded for one file must have contiguous numbers, starting with 1. |
| [data.range] | <code>Object</code> | The range of bytes to copy. If not provided, the whole source file will be copied. |
| [callback] | <code>function</code> |  |

<a name="b2CloudStorage+copyFile"></a>

### b2CloudStorage.copyFile(data, [callback]) ⇒ <code>object</code>
Copies a any size file using either `b2_copy_file` or `b2_copy_part` method automatically.

**Kind**: instance method of [<code>b2CloudStorage</code>](#b2CloudStorage)  
**Returns**: <code>object</code> - Returns an object with 3 helper methods: `cancel()`, `progress()`, & `info()`  

| Param | Type | Description |
| --- | --- | --- |
| data | <code>Object</code> | Message Body Parameters |
| data.sourceFileId | <code>String</code> | The ID of the source file being copied. |
| data.fileName | <code>String</code> | The name of the new file being created. |
| [data.size] | <code>Number</code> | Size of the file. If not specified will be looked up with an extra class C API call to `b2_get_file_info`. |
| [data.destinationBucketId] | <code>String</code> | The ID of the bucket where the copied file will be stored. Uses original file bucket when unset. |
| [data.range] | <code>String</code> | The range of bytes to copy. If not provided, the whole source file will be copied. |
| [data.metadataDirective] | <code>String</code> | The strategy for how to populate metadata for the new file. |
| [data.contentType] | <code>String</code> | Must only be supplied if the metadataDirective is REPLACE. The MIME type of the content of the file, which will be returned in the Content-Type header when downloading the file. |
| [data.onUploadProgress] | <code>function</code> | Callback function on progress of entire copy |
| [data.progressInterval] | <code>Number</code> | How frequently the `onUploadProgress` callback is fired during upload |
| [data.partSize] | <code>Number</code> | Overwrite the default part size as defined by the b2 authorization process |
| [data.fileInfo] | <code>Object</code> | Must only be supplied if the metadataDirective is REPLACE. This field stores the metadata that will be stored with the file. |
| [callback] | <code>function</code> |  |

<a name="b2CloudStorage+createBucket"></a>

### b2CloudStorage.createBucket(data, [callback])
`b2_create_bucket` Creates a new bucket. A bucket belongs to the account used to create it.

**Kind**: instance method of [<code>b2CloudStorage</code>](#b2CloudStorage)  

| Param | Type | Description |
| --- | --- | --- |
| data | <code>Object</code> | Message Body Parameters |
| data.bucketName | <code>String</code> | The name to give the new bucket. |
| data.bucketType | <code>String</code> | Either "allPublic", meaning that files in this bucket can be downloaded by anybody, or "allPrivate", meaning that you need a bucket authorization token to download the files. |
| [data.accountId] | <code>String</code> | The ID of your account. When unset will use the `b2_authorize` results `accountId`. |
| [data.bucketInfo] | <code>Object</code> | User-defined information to be stored with the bucket: a JSON object mapping names to values. See Buckets. Cache-Control policies can be set here on a global level for all the files in the bucket. |
| [data.corsRules] | <code>Array</code> | The initial list (a JSON array) of CORS rules for this bucket. See CORS Rules for an overview and the rule structure. |
| [data.lifecycleRules] | <code>Array</code> | The initial list (a JSON array) of lifecycle rules for this bucket. Structure defined below. See Lifecycle Rules. |
| [callback] | <code>function</code> |  |

<a name="b2CloudStorage+updateBucket"></a>

### b2CloudStorage.updateBucket(data, [callback])
`b2_update_bucket` Update an existing bucket.

**Kind**: instance method of [<code>b2CloudStorage</code>](#b2CloudStorage)  

| Param | Type | Description |
| --- | --- | --- |
| data | <code>Object</code> | Message Body Parameters |
| data.bucketId | <code>String</code> | The unique ID of the bucket. |
| [data.accountId] | <code>String</code> | The ID of your account. When unset will use the `b2_authorize` results `accountId`. |
| [data.bucketType] | <code>String</code> | Either "allPublic", meaning that files in this bucket can be downloaded by anybody, or "allPrivate", meaning that you need a bucket authorization token to download the files. |
| [data.bucketInfo] | <code>Object</code> | User-defined information to be stored with the bucket: a JSON object mapping names to values. See Buckets. Cache-Control policies can be set here on a global level for all the files in the bucket. |
| [data.corsRules] | <code>Array</code> | The initial list (a JSON array) of CORS rules for this bucket. See CORS Rules for an overview and the rule structure. |
| [data.lifecycleRules] | <code>Array</code> | The initial list (a JSON array) of lifecycle rules for this bucket. Structure defined below. See Lifecycle Rules. |
| [data.ifRevisionIs] | <code>Array</code> | When set, the update will only happen if the revision number stored in the B2 service matches the one passed in. This can be used to avoid having simultaneous updates make conflicting changes. |
| [callback] | <code>function</code> |  |

<a name="b2CloudStorage+deleteBucket"></a>

### b2CloudStorage.deleteBucket(data, [callback])
`b2_delete_bucket` Deletes the bucket specified. Only buckets that contain no version of any files can be deleted.

**Kind**: instance method of [<code>b2CloudStorage</code>](#b2CloudStorage)  

| Param | Type | Description |
| --- | --- | --- |
| data | <code>Object</code> \| <code>String</code> | Message Body Parameters. If a string is provided it will be treated as the `bucketId`. |
| data.bucketId | <code>String</code> | The unique ID of the bucket. |
| [data.accountId] | <code>String</code> | The ID of your account. When unset will use the `b2_authorize` results `accountId`. |
| [callback] | <code>function</code> |  |

<a name="b2CloudStorage+listFileNames"></a>

### b2CloudStorage.listFileNames(data, [callback])
`b2_list_file_names` Lists the names of all files in a bucket, starting at a given name.

**Kind**: instance method of [<code>b2CloudStorage</code>](#b2CloudStorage)  

| Param | Type | Description |
| --- | --- | --- |
| data | <code>Object</code> | Message Body Parameters. If a string is provided it will be treated as the `bucketId`. |
| data.bucketId | <code>String</code> | The unique ID of the bucket. |
| [data.startFileName] | <code>String</code> | The first file name to return. If there is a file with this name, it will be returned in the list. If not, the first file name after this the first one after this name. |
| [data.maxFileCount] | <code>Number</code> | The maximum number of files to return from this call. The default value is 100, and the maximum is 10000. Passing in 0 means to use the default of 100. |
| [data.prefix] | <code>String</code> | Files returned will be limited to those with the given prefix. Defaults to the empty string, which matches all files. |
| [data.delimiter] | <code>String</code> | files returned will be limited to those within the top folder, or any one subfolder. Defaults to NULL. Folder names will also be returned. The delimiter character will be used to "break" file names into folders. |
| [callback] | <code>function</code> |  |

<a name="b2CloudStorage+listFileVersions"></a>

### b2CloudStorage.listFileVersions(data, [callback])
`b2_list_file_versions` Lists all of the versions of all of the files contained in one bucket, in alphabetical order by file name, and by reverse of date/time uploaded for versions of files with the same name.

**Kind**: instance method of [<code>b2CloudStorage</code>](#b2CloudStorage)  

| Param | Type | Description |
| --- | --- | --- |
| data | <code>Object</code> | Message Body Parameters. If a string is provided it will be treated as the `bucketId`. |
| data.bucketId | <code>String</code> | The unique ID of the bucket. |
| [data.startFileName] | <code>String</code> | The first file name to return. If there is a file with this name, it will be returned in the list. If not, the first file name after this the first one after this name. |
| [data.startFileId] | <code>Number</code> | The first file ID to return. startFileName must also be provided if startFileId is specified. |
| [data.maxFileCount] | <code>Number</code> | The maximum number of files to return from this call. The default value is 100, and the maximum is 10000. Passing in 0 means to use the default of 100. |
| [data.prefix] | <code>String</code> | Files returned will be limited to those with the given prefix. Defaults to the empty string, which matches all files. |
| [data.delimiter] | <code>String</code> | files returned will be limited to those within the top folder, or any one subfolder. Defaults to NULL. Folder names will also be returned. The delimiter character will be used to "break" file names into folders. |
| [callback] | <code>function</code> |  |

<a name="b2CloudStorage+listKeys"></a>

### b2CloudStorage.listKeys([data], [callback])
`b2_list_keys` Lists application keys associated with an account.

**Kind**: instance method of [<code>b2CloudStorage</code>](#b2CloudStorage)  

| Param | Type | Description |
| --- | --- | --- |
| [data] | <code>Object</code> | Message Body Parameters. If a string is provided it will be treated as the `bucketId`. |
| [data.accountId] | <code>String</code> | The ID of your account. When unset will use the `b2_authorize` results `accountId`. |
| [data.maxKeyCount] | <code>Number</code> | The ID of your account. When unset will use the `b2_authorize` results `accountId`. |
| [data.startApplicationKeyId] | <code>String</code> | The first key to return. Used when a query hits the maxKeyCount, and you want to get more. Set to the value returned as the nextApplicationKeyId in the previous query. |
| [callback] | <code>function</code> |  |

<a name="b2CloudStorage+createKey"></a>

### b2CloudStorage.createKey(data, [callback])
`b2_create_key` Creates a new application key.

**Kind**: instance method of [<code>b2CloudStorage</code>](#b2CloudStorage)  

| Param | Type | Description |
| --- | --- | --- |
| data | <code>Object</code> | Message Body Parameters. |
| data.capabilities | <code>Number</code> | A list of strings, each one naming a capability the new key should have. Possibilities are: `listKeys`, `writeKeys`, `deleteKeys`, `listBuckets`, `writeBuckets`, `deleteBuckets`, `listFiles`, `readFiles`, `shareFiles`, `writeFiles`, and `deleteFiles`. |
| data.keyName | <code>Number</code> | A name for this key. There is no requirement that the name be unique. The name cannot be used to look up the key. Names can contain letters, numbers, and "-", and are limited to 100 characters. |
| [data.accountId] | <code>String</code> | The ID of your account. When unset will use the `b2_authorize` results `accountId`. |
| [data.validDurationInSeconds] | <code>Number</code> | When provided, the key will expire after the given number of seconds, and will have expirationTimestamp set. Value must be a positive integer, and must be less than 1000 days (in seconds). |
| [data.bucketId] | <code>String</code> | When present, the new key can only access this bucket. When set, only these capabilities can be specified: `listBuckets`, `listFiles`, `readFiles`, `shareFiles`, `writeFiles`, and `deleteFiles`. |
| [data.namePrefix] | <code>String</code> | When present, restricts access to files whose names start with the prefix. You must set `bucketId` when setting this. |
| [callback] | <code>function</code> |  |

<a name="b2CloudStorage+deleteKey"></a>

### b2CloudStorage.deleteKey(applicationKeyId, [callback])
`b2_delete_key` Deletes the application key specified.

**Kind**: instance method of [<code>b2CloudStorage</code>](#b2CloudStorage)  

| Param | Type | Description |
| --- | --- | --- |
| applicationKeyId | <code>String</code> | The key to delete. |
| [callback] | <code>function</code> |  |

<a name="b2CloudStorage+deleteFileVersion"></a>

### b2CloudStorage.deleteFileVersion(data, [callback])
`b2_delete_file_version` Deletes one version of a file from B2.

**Kind**: instance method of [<code>b2CloudStorage</code>](#b2CloudStorage)  

| Param | Type | Description |
| --- | --- | --- |
| data | <code>Object</code> | Message Body Parameters. |
| data.fileName | <code>String</code> | The name of the file. |
| data.fileId | <code>String</code> | The ID of the file, as returned by `b2_upload_file`, `b2_list_file_names`, or `b2_list_file_versions`. |
| [callback] | <code>function</code> |  |

<a name="b2CloudStorage+downloadFileById"></a>

### b2CloudStorage.downloadFileById(data, [callback])
`b2_download_file_by_id` Downloads one file from B2.

**Kind**: instance method of [<code>b2CloudStorage</code>](#b2CloudStorage)  

| Param | Type | Description |
| --- | --- | --- |
| data | <code>Object</code> | Request Details |
| data.Authorization | <code>String</code> | An account authorization token. |
| data.Range | <code>String</code> | A standard byte-range request, which will return just part of the stored file. |
| data.b2ContentDisposition | <code>String</code> | If this is present, B2 will use it as the value of the 'Content-Disposition' header, overriding any 'b2-content-disposition' specified when the file was uploaded. |
| [callback] | <code>function</code> |  |

<a name="b2CloudStorage+downloadFileByName"></a>

### b2CloudStorage.downloadFileByName(data, [callback])
`b2_download_file_by_name` Downloads one file by providing the name of the bucket and the name of the file.

**Kind**: instance method of [<code>b2CloudStorage</code>](#b2CloudStorage)  

| Param | Type | Description |
| --- | --- | --- |
| data | <code>Object</code> | Request HTTP Headers |
| data.downloadUrl | <code>String</code> | Download hostname URL. |
| data.bucket | <code>String</code> | Bucket name. |
| data.fileName | <code>String</code> | file name. |
| [data.Authorization] | <code>String</code> | An account authorization token. |
| [data.Range] | <code>String</code> | A standard byte-range request, which will return just part of the stored file. |
| [callback] | <code>function</code> |  |

<a name="b2CloudStorage+getDownloadAuthorization"></a>

### b2CloudStorage.getDownloadAuthorization(data, [callback])
`b2_get_download_authorization` Used to generate an authorization token that can be used to download files with the specified prefix (and other optional headers) from a private B2 bucket. Returns an authorization token that can be passed to `b2_download_file_by_name` in the Authorization header or as an Authorization parameter.

**Kind**: instance method of [<code>b2CloudStorage</code>](#b2CloudStorage)  

| Param | Type | Description |
| --- | --- | --- |
| data | <code>Object</code> | Message Body Parameters. |
| data.bucketId | <code>String</code> | The identifier for the bucket. |
| data.fileNamePrefix | <code>String</code> | The file name prefix of files the download authorization token will allow `b2_download_file_by_name` to access. |
| data.validDurationInSeconds | <code>Number</code> | The number of seconds before the authorization token will expire. The minimum value is 1 second. The maximum value is 604800 which is one week in seconds. |
| [data.b2ContentDisposition] | <code>Number</code> | If this is present, download requests using the returned authorization must include the same value for b2ContentDisposition. The value must match the grammar specified in RFC 6266 (except that parameter names that contain an '*' are not allowed). |
| [callback] | <code>function</code> |  |

<a name="b2CloudStorage+hideFile"></a>

### b2CloudStorage.hideFile(data, [callback])
`b2_hide_file` Hides a file so that downloading by name will not find the file, but previous versions of the file are still stored. See File Versions about what it means to hide a file.

**Kind**: instance method of [<code>b2CloudStorage</code>](#b2CloudStorage)  

| Param | Type | Description |
| --- | --- | --- |
| data | <code>Object</code> | Message Body Parameters. |
| data.bucketId | <code>String</code> | The bucket containing the file to hide. |
| data.fileName | <code>String</code> | The name of the file to hide. |
| [callback] | <code>function</code> |  |

<a name="b2CloudStorage+request"></a>

### b2CloudStorage.request(data, callback)
Helper method: Request wrapper used to call Backblaze B2 API. All class methods consume this method internally.

**Kind**: instance method of [<code>b2CloudStorage</code>](#b2CloudStorage)  

| Param | Type | Description |
| --- | --- | --- |
| data | <code>object</code> | Options object. Matches the same of the [`request`](https://github.com/request/request) npm module. The options listed below are changed or modified for this api. |
| data.url | <code>string</code> | URI path to append after the hostname, api path, and version. |
| data.appendPath | <code>boolean</code> | (internal) When set to false will prevent extra URI and hostname changes. Most useful when combined with `apiUrl` |
| data.apiUrl | <code>boolean</code> | (internal) Full URL path or hostname to replace. Most useful when combined with `appendPath`. |
| callback | <code>function</code> | [description] |

<a name="b2CloudStorage+copySmallFile"></a>

### b2CloudStorage.copySmallFile(data, [callback]) ⇒ <code>object</code>
Helper function for `b2_copy_file` Creates a new file by copying from an existing file. Limited to 5GB

**Kind**: instance method of [<code>b2CloudStorage</code>](#b2CloudStorage)  
**Returns**: <code>object</code> - Returns an object with 1 helper method: `cancel()`  

| Param | Type | Description |
| --- | --- | --- |
| data | <code>Object</code> | Message Body Parameters |
| data.sourceFileId | <code>String</code> | The ID of the source file being copied. |
| data.fileName | <code>String</code> | The name of the new file being created. |
| [data.destinationBucketId] | <code>String</code> | The ID of the bucket where the copied file will be stored. Uses original file bucket when unset. |
| [data.range] | <code>Object</code> | The range of bytes to copy. If not provided, the whole source file will be copied. |
| [data.metadataDirective] | <code>String</code> | The strategy for how to populate metadata for the new file. |
| [data.contentType] | <code>String</code> | Must only be supplied if the metadataDirective is REPLACE. The MIME type of the content of the file, which will be returned in the Content-Type header when downloading the file. |
| [data.fileInfo] | <code>Object</code> | Must only be supplied if the metadataDirective is REPLACE. This field stores the metadata that will be stored with the file. |
| [callback] | <code>function</code> |  |

<a name="b2CloudStorage+copyLargeFile"></a>

### b2CloudStorage.copyLargeFile(data, [callback])
Helper function for `b2_copy_file` Creates a new file by copying from an existing file. Limited to 5GB

**Kind**: instance method of [<code>b2CloudStorage</code>](#b2CloudStorage)  

| Param | Type | Description |
| --- | --- | --- |
| data | <code>Object</code> | Message Body Parameters |
| data.sourceFileId | <code>String</code> | The ID of the source file being copied. |
| data.fileName | <code>String</code> | The name of the new file being created. |
| data.destinationBucketId | <code>String</code> | The ID of the bucket where the copied file will be stored. Uses original file bucket when unset. |
| data.contentType | <code>String</code> | Must only be supplied if the metadataDirective is REPLACE. The MIME type of the content of the file, which will be returned in the Content-Type header when downloading the file. |
| data.size | <code>Number</code> | Content size of target large file |
| data.hash | <code>String</code> | sha1 hash for the target large file |
| [data.onUploadProgress] | <code>function</code> | Callback function on progress of entire copy |
| [data.progressInterval] | <code>Number</code> | How frequently the `onUploadProgress` callback is fired during upload |
| [data.partSize] | <code>Number</code> | Overwrite the default part size as defined by the b2 authorization process |
| [data.fileInfo] | <code>Object</code> | Must only be supplied if the metadataDirective is REPLACE. This field stores the metadata that will be stored with the file. |
| [callback] | <code>function</code> |  |

