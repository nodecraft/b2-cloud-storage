'use strict';
const url = require('url'),
	crypto = require('crypto'),
	fs = require('fs');

const request = require('request'),
	_ = require('lodash'),
	async = require('async');

/**
 * Backblaze B2 Cloud Storage class to handle stream-based uploads and all other API methods.
 */
const b2CloudStorage = class {
	/**
	 * Creates new instance of the b2CloudStorage class.
	 * @param  {object} options Required: Class options to set auth and other options
	 * @param  {object} options.auth Authentication object
	 * @param  {string} options.auth.accountId Backblaze b2 account ID for the API key.
	 * @param  {string} options.auth.applicationKey Backblaze b2 application API key.
	 * @param  {number} options.maxSmallFileSize Maximum filesize for the upload to upload as a single upload. Any larger size will be chunked as a Large File upload.
	 * @param  {string} options.url URL hostname to use when authenticating to Backblaze B2. This omits `b2api/` and the version from the URI.
	 * @param  {string} options.version API version used in the Backblaze B2 url. This follows hthe `b2api/` part of the URI.
	 * @param  {number} options.maxPartAttempts Maximum retries each part can reattempt before erroring when uploading a Large File.
	 * @param  {number} options.maxTotalErrors Maximum total errors the collective list of file parts can trigger (below the individual maxPartAttempts) before the Large File upload is considered failed.
	 * @param  {number} options.maxReauthAttempts Maximum times this library will try to reauthenticate if an auth token expires, before assuming failure.
	 * @return {undefined}
	 */
	constructor(options){
		if(!options || !options.auth){
			throw new Error('Missing authentication object');
		}
		if(!options.auth.accountId){
			throw new Error('Missing authentication accountId');
		}
		if(!options.auth.applicationKey){
			throw new Error('Missing authentication applicationKey');
		}

		this.maxSmallFileSize = options.maxSmallFileSize || 100000000;
		if(this.maxSmallFileSize > 5000000000){
			throw new Error('maxSmallFileSize can not exceed 5GB');
		}
		if(this.maxSmallFileSize < 100000000){
			throw new Error('maxSmallFileSize can not be less than 100MB');
		}

		this.auth = options.auth;
		this.url = options.url || 'https://api.backblazeb2.com';
		this.version = options.version || 'v2';
		this.maxPartAttempts = options.maxPartAttempts || 3; // retry each chunk up to 3 times
		this.maxTotalErrors = options.maxTotalErrors || 10; // quit if 10 chunks fail
		this.maxReauthAttempts = options.maxReauthAttempts || 3; // quit if 3 re-auth attempts fail
	}

	/**
	 * `b2_authorize_account` method, required before calling any B2 API routes.
	 * @param {Function} [callback]
	 */
	authorize(callback){
		this.request({
			auth: {
				user: this.auth.accountId,
				password: this.auth.applicationKey
			},
			apiUrl: 'https://api.backblazeb2.com',
			url: 'b2_authorize_account'
		}, (err, results) => {
			if(err){
				return callback(err);
			}
			this.authData = results;
			this.url = results.apiUrl;
			return callback(null, results);
		});
	}

	/**
	 * Upload file with `b2_upload_file` or as several parts of a large file upload.
	 * This method also will get the filesize & sha1 hash of the entire file.
	 * @param {String} filename Path to filename to for upload.
	 * @param {Object} data Configuration data passed from the `uploadFile` method.
	 * @param {String} data.bucketId The target bucket the file is to be uploaded.
	 * @param {String} data.fileName The object keyname that is being uploaded.
	 * @param {String} data.contentType Content/mimetype required for file download.
	 * @param {Function} [data.onUploadProgress] Callback function on progress of entire upload
	 * @param {Object} [data.info] File info metadata for the file.
	 * @param {String} [data.hash] Skips the sha1 hash step with hash already provided.
	 * @param {Function} [callback]
	 * @returns {object} Returns an object with 3 helper methods: `cancel()`, `progress()`, & `info()`
	 */
	uploadFile(filename, data, callback = function(){}){
		// todo: check if allowed (access) to upload files
		if(data.partSize < 5000000){
			return callback(new Error('partSize can not be lower than 5MB'));
		}

		const self = this;
		let smallFile = null;
		let cancel = null;

		let fileFuncs = {};
		let returnFuncs = {
			cancel: function(){
				cancel = true;
				if(fileFuncs.cancel){
					return fileFuncs.cancel();
				}
			},
			progress: function(){
				if(fileFuncs.progress){
					return fileFuncs.progress();
				}
				return {
					percent: 0,
					bytesDispatched: 0,
					bytesTotal: data.size || 0
				};
			},
			info: function(){
				if(fileFuncs.info){
					return fileFuncs.info();
				}
				return null;
			}
		};
		async.series([
			function(cb){
				if(cancel){ return cb(new Error('B2 upload cancelled')); }
				if(data.hash){ return cb(); }
				self.getFileHash(filename, function(err, hash){
					if(err){ return cb(err); }
					data.hash = hash;
					return cb();
				});
			},
			function(cb){
				if(cancel){ return cb(new Error('B2 upload cancelled')); }
				self.getStat(filename, function(err, stat){
					if(err){ return cb(err); }
					data.stat = stat;
					data.size = stat.size;
					smallFile = data.size <= self.maxSmallFileSize;
					return cb();
				});
			}
		], function(err){
			if(cancel){ return callback(new Error('B2 upload cancelled')); }
			if(err){
				return callback(err);
			}
			if(smallFile){
				fileFuncs = self.uploadFileSmall(filename, data, callback);
				return;
			}
			fileFuncs = self.uploadFileLarge(filename, data, callback);
		});
		return returnFuncs;
	}

	/**
	 * `b2_list_parts` Lists the parts that have been uploaded for a large file that has not been finished yet.
	 * @param {Object} data Message Body Parameters
	 * @param {String} data.fileId The ID returned by `b2_start_large_file`. This is the file whose parts will be listed.
	 * @param {Number} [data.startPartNumber] The first part to return. If there is a part with this number, it will be returned as the first in the list. If not, the returned list will start with the first part number after this one.
	 * @param {Number} [data.maxPartCount] The maximum number of parts to return from this call. The default value is 100, and the maximum allowed is 1000.
	 * @param {Function} [callback]
	 */
	listParts(data, callback){
		return this.request({
			url: 'b2_list_parts',
			method: 'POST',
			json: data
		}, callback);
	}

	/**
	 * `b2_list_unfinished_large_files` Lists information about large file uploads that have been started, but have not been finished or canceled.
	 * @param {Object} data Message Body Parameters
	 * @param {String} data.bucketId The bucket to look for file names in.
	 * @param {String} [data.namePrefix] When a `namePrefix` is provided, only files whose names match the prefix will be returned. When using an application key that is restricted to a name prefix, you must provide a prefix here that is at least as restrictive.
	 * @param {String} [data.startFileId] The first upload to return. If there is an upload with this ID, it will be returned in the list. If not, the first upload after this the first one after this ID.
	 * @param {Number} [data.maxFileCount] The maximum number of files to return from this call. The default value is 100, and the maximum allowed is 100.
	 * @param {Function} [callback]
	 */
	listUnfinishedLargeFiles(data, callback){
		return this.request({
			url: 'b2_list_unfinished_large_files',
			method: 'POST',
			json: data
		}, callback);
	}

	/**
	 * `b2_get_file_info` Gets information about one file stored in B2.
	 * @param {String} fileId The ID of the file, as returned by `b2_upload_file`, `b2_hide_file`, `b2_list_file_names`, or `b2_list_file_versions`.
	 * @param {Function} [callback]
	 */
	getFileInfo(fileId, callback){
		return this.request({
			url: 'b2_get_file_info',
			method: 'POST',
			json: {
				fileId
			}
		}, callback);
	}

	/**
	 * `b2_list_buckets` Lists buckets associated with an account, in alphabetical order by bucket name.
	 * @param {Object} [data] Message Body Parameters
	 * @param {String} [data.accountId] The ID of your account. When unset will use the `b2_authorize` results `accountId`.
	 * @param {String} [data.bucketId] When bucketId is specified, the result will be a list containing just this bucket, if it's present in the account, or no buckets if the account does not have a bucket with this ID.
	 * @param {Array} [data.bucketTypes] One of: "allPublic", "allPrivate", "snapshot", or other values added in the future. "allPublic" means that anybody can download the files is the bucket; "allPrivate" means that you need an authorization token to download them; "snapshot" means that it's a private bucket containing snapshots created on the B2 web site.
	 * @param {Function} [callback]
	 */
	listBuckets(data, callback){
		if(!callback && data){
			callback = data;
			data = {};
		}
		if(!data.accountId){
			data.accountId = this.authData.accountId;
		}
		return this.request({
			url: 'b2_list_buckets',
			method: 'POST',
			json: data
		}, callback);
	}

	/**
	 * `b2_copy_file` Creates a new file by copying from an existing file.
	 * @param {Object} data Message Body Parameters
	 * @param {String} data.sourceFileId The ID of the source file being copied.
	 * @param {String} data.fileName The name of the new file being created.
	 * @param {String} [data.destinationBucketId] The ID of the bucket where the copied file will be stored. Uses original file bucket when unset.
	 * @param {Object} [data.range] The range of bytes to copy. If not provided, the whole source file will be copied.
	 * @param {Array} [data.metadataDirective] The strategy for how to populate metadata for the new file.
	 * @param {Array} [data.contentType] Must only be supplied if the metadataDirective is REPLACE. The MIME type of the content of the file, which will be returned in the Content-Type header when downloading the file.
	 * @param {Array} [data.fileInfo] Must only be supplied if the metadataDirective is REPLACE. This field stores the metadata that will be stored with the file. 
	 * @param {Function} [callback]
	 */
	copyFile(data, callback){
		if(!data.accountId){
			data.accountId = this.authData.accountId;
		}
		return this.request({
			url: 'b2_copy_file',
			method: 'POST',
			json: data
		}, callback);
	}

	/**
	 * `b2_copy_part` Creates a new file by copying from an existing file.
	 * @param {Object} data Message Body Parameters
	 * @param {String} data.sourceFileId The ID of the source file being copied.
	 * @param {String} data.largeFileId The ID of the large file the part will belong to, as returned by b2_start_large_file.
	 * @param {String} [data.partNumber] A number from 1 to 10000. The parts uploaded for one file must have contiguous numbers, starting with 1.
	 * @param {Object} [data.range] The range of bytes to copy. If not provided, the whole source file will be copied.
	 * @param {Function} [callback]
	 */
	copyFilePart(data, callback){
		if(!data.accountId){
			data.accountId = this.authData.accountId;
		}
		return this.request({
			url: 'b2_copy_part',
			method: 'POST',
			json: data
		}, callback);
	}

	/**
	 * `b2_create_bucket` Creates a new bucket. A bucket belongs to the account used to create it.
	 * @param {Object} data Message Body Parameters
	 * @param {String} data.bucketName The name to give the new bucket.
	 * @param {String} data.bucketType Either "allPublic", meaning that files in this bucket can be downloaded by anybody, or "allPrivate", meaning that you need a bucket authorization token to download the files.
	 * @param {String} [data.accountId] The ID of your account. When unset will use the `b2_authorize` results `accountId`.
	 * @param {Object} [data.bucketInfo] User-defined information to be stored with the bucket: a JSON object mapping names to values. See Buckets. Cache-Control policies can be set here on a global level for all the files in the bucket.
	 * @param {Array} [data.corsRules] The initial list (a JSON array) of CORS rules for this bucket. See CORS Rules for an overview and the rule structure.
	 * @param {Array} [data.lifecycleRules] The initial list (a JSON array) of lifecycle rules for this bucket. Structure defined below. See Lifecycle Rules.
	 * @param {Function} [callback]
	 */
	createBucket(data, callback){
		if(!data.accountId){
			data.accountId = this.authData.accountId;
		}
		return this.request({
			url: 'b2_create_bucket',
			method: 'POST',
			json: data
		}, callback);
	}

	/**
	 * `b2_update_bucket` Update an existing bucket.
	 * @param {Object} data Message Body Parameters
	 * @param {String} data.bucketId The unique ID of the bucket.
	 * @param {String} [data.accountId] The ID of your account. When unset will use the `b2_authorize` results `accountId`.
	 * @param {String} [data.bucketType] Either "allPublic", meaning that files in this bucket can be downloaded by anybody, or "allPrivate", meaning that you need a bucket authorization token to download the files.
	 * @param {Object} [data.bucketInfo] User-defined information to be stored with the bucket: a JSON object mapping names to values. See Buckets. Cache-Control policies can be set here on a global level for all the files in the bucket.
	 * @param {Array} [data.corsRules] The initial list (a JSON array) of CORS rules for this bucket. See CORS Rules for an overview and the rule structure.
	 * @param {Array} [data.lifecycleRules] The initial list (a JSON array) of lifecycle rules for this bucket. Structure defined below. See Lifecycle Rules.
	 * @param {Array} [data.ifRevisionIs] When set, the update will only happen if the revision number stored in the B2 service matches the one passed in. This can be used to avoid having simultaneous updates make conflicting changes.
	 * @param {Function} [callback]
	 */
	updateBucket(data, callback){
		if(!data.accountId){
			data.accountId = this.authData.accountId;
		}
		return this.request({
			url: 'b2_update_bucket',
			method: 'POST',
			json: data
		}, callback);
	}

	/**
	 * `b2_delete_bucket` Deletes the bucket specified. Only buckets that contain no version of any files can be deleted.
	 * @param {Object|String} data Message Body Parameters. If a string is provided it will be treated as the `bucketId`.
	 * @param {String} data.bucketId The unique ID of the bucket.
	 * @param {String} [data.accountId] The ID of your account. When unset will use the `b2_authorize` results `accountId`.
	 * @param {Function} [callback]
	 */
	deleteBucket(data, callback){
		if(typeof(data) === 'string'){
			data = {
				bucketId: data
			};
		}
		if(!data.accountId){
			data.accountId = this.authData.accountId;
		}
		return this.request({
			url: 'b2_delete_bucket',
			method: 'POST',
			json: data
		}, callback);
	}

	// TODO: create helper to handle looping

	/**
	 * `b2_list_file_names` Lists the names of all files in a bucket, starting at a given name.
	 * @param {Object} data Message Body Parameters. If a string is provided it will be treated as the `bucketId`.
	 * @param {String} data.bucketId The unique ID of the bucket.
	 * @param {String} [data.startFileName] The first file name to return. If there is a file with this name, it will be returned in the list. If not, the first file name after this the first one after this name.
	 * @param {Number} [data.maxFileCount] The maximum number of files to return from this call. The default value is 100, and the maximum is 10000. Passing in 0 means to use the default of 100.
	 * @param {String} [data.prefix] Files returned will be limited to those with the given prefix. Defaults to the empty string, which matches all files.
	 * @param {String} [data.delimiter] iles returned will be limited to those within the top folder, or any one subfolder. Defaults to NULL. Folder names will also be returned. The delimiter character will be used to "break" file names into folders.
	 * @param {Function} [callback]
	 */
	listFileNames(data, callback){
		return this.request({
			url: 'b2_list_file_names',
			method: 'POST',
			json: data
		}, callback);
	}

	/**
	 * `b2_list_file_versions` Lists all of the versions of all of the files contained in one bucket, in alphabetical order by file name, and by reverse of date/time uploaded for versions of files with the same name.
	 * @param {Object} data Message Body Parameters. If a string is provided it will be treated as the `bucketId`.
	 * @param {String} data.bucketId The unique ID of the bucket.
	 * @param {String} [data.startFileName] The first file name to return. If there is a file with this name, it will be returned in the list. If not, the first file name after this the first one after this name.
	 * @param {Number} [data.startFileId] The first file ID to return. startFileName must also be provided if startFileId is specified.
	 * @param {Number} [data.maxFileCount] The maximum number of files to return from this call. The default value is 100, and the maximum is 10000. Passing in 0 means to use the default of 100.
	 * @param {String} [data.prefix] Files returned will be limited to those with the given prefix. Defaults to the empty string, which matches all files.
	 * @param {String} [data.delimiter] iles returned will be limited to those within the top folder, or any one subfolder. Defaults to NULL. Folder names will also be returned. The delimiter character will be used to "break" file names into folders.
	 * @param {Function} [callback]
	 */
	listFileVersions(data, callback){
		return this.request({
			url: 'b2_list_file_versions',
			method: 'POST',
			json: data
		}, callback);
	}

	/**
	 * `b2_list_keys` Deletes the bucket specified. Only buckets that contain no version of any files can be deleted.
	 * @param {Object} [data] Message Body Parameters. If a string is provided it will be treated as the `bucketId`.
	 * @param {String} [data.accountId] The ID of your account. When unset will use the `b2_authorize` results `accountId`.
	 * @param {Number} [data.maxKeyCount] The ID of your account. When unset will use the `b2_authorize` results `accountId`.
	 * @param {String} [data.startApplicationKeyId] The first key to return. Used when a query hits the maxKeyCount, and you want to get more. Set to the value returned as the nextApplicationKeyId in the previous query.
	 * @param {Function} [callback]
	 */
	listKeys(data, callback){
		if(!callback && data){
			callback = data;
			data = {};
		}
		if(!data.accountId){
			data.accountId = this.authData.accountId;
		}
		return this.request({
			url: 'b2_list_keys',
			method: 'POST',
			json: data
		}, callback);
	}

	/**
	 * `b2_create_key` Creates a new application key.
	 * @param {Object} data Message Body Parameters.
	 * @param {Number} data.capabilities A list of strings, each one naming a capability the new key should have. Possibilities are: `listKeys`, `writeKeys`, `deleteKeys`, `listBuckets`, `writeBuckets`, `deleteBuckets`, `listFiles`, `readFiles`, `shareFiles`, `writeFiles`, and `deleteFiles`.
	 * @param {Number} data.keyName A name for this key. There is no requirement that the name be unique. The name cannot be used to look up the key. Names can contain letters, numbers, and "-", and are limited to 100 characters.
	 * @param {String} [data.accountId] The ID of your account. When unset will use the `b2_authorize` results `accountId`.
	 * @param {Number} [data.validDurationInSeconds] When provided, the key will expire after the given number of seconds, and will have expirationTimestamp set. Value must be a positive integer, and must be less than 1000 days (in seconds).
	 * @param {String} [data.bucketId] When present, the new key can only access this bucket. When set, only these capabilities can be specified: `listBuckets`, `listFiles`, `readFiles`, `shareFiles`, `writeFiles`, and `deleteFiles`.
	 * @param {String} [data.namePrefix] When present, restricts access to files whose names start with the prefix. You must set `bucketId` when setting this.
	 * @param {Function} [callback]
	 */
	createKey(data, callback){
		if(!data.accountId){
			data.accountId = this.authData.accountId;
		}
		return this.request({
			url: 'b2_create_key',
			method: 'POST',
			json: data
		}, callback);
	}

	/**
	 * `b2_delete_key` Deletes the application key specified.
	 * @param {String} applicationKeyId The key to delete.
	 * @param {Function} [callback]
	 */
	deleteKey(applicationKeyId, callback){
		return this.request({
			url: 'b2_delete_key',
			method: 'POST',
			json: {
				applicationKeyId
			}
		}, callback);
	}

	// todo: improve and add ability to delete file + all versions

	/**
	 * `b2_delete_file_version` Deletes one version of a file from B2.
	 * @param {Object} data Message Body Parameters.
	 * @param {String} data.fileName The name of the file.
	 * @param {String} data.fileId The ID of the file, as returned by `b2_upload_file`, `b2_list_file_names`, or `b2_list_file_versions`.
	 * @param {Function} [callback]
	 */
	deleteFileVersion(data, callback){
		return this.request({
			url: 'b2_delete_file_version',
			method: 'POST',
			json: data
		}, callback);
	}

	// todo: greatly improve download functions

	/**
	 * `b2_download_file_by_id` Downloads one file from B2.
	 * @param {Object} data Request Details
	 * @param {String} data.Authorization An account authorization token.
	 * @param {String} data.Range A standard byte-range request, which will return just part of the stored file.
	 * @param {String} data.b2ContentDisposition If this is present, B2 will use it as the value of the 'Content-Disposition' header, overriding any 'b2-content-disposition' specified when the file was uploaded.
	 * @param {Function} [callback]
	 */
	downloadFileById(data, callback){
		if(!callback && typeof(callback) === 'function'){
			callback = data;
			data = {};
		}
		return this.request({
			url: 'b2_download_file_by_id',
			method: 'GET',
			qs: data
		}, callback);
	}
	// todo: greatly improve authorization magic

	/**
	 * `b2_download_file_by_name` Downloads one file by providing the name of the bucket and the name of the file.
	 * @param {Object} data Request HTTP Headers
	 * @param {String} data.downloadUrl Download hostname URL.
	 * @param {String} data.bucket Bucket name.
	 * @param {String} data.fileName file name.
	 * @param {String} [data.Authorization] An account authorization token.
	 * @param {String} [data.Range] A standard byte-range request, which will return just part of the stored file.
	 * @param {Function} [callback]
	 */
	downloadFileByName(data, callback){
		const requestData = {
			url: `${data.downloadUrl}/file/${data.bucket}/${data.fileName}`,
			method: 'GET',
			json: false,
			headers: {}
		};
		if(data.Authorization){
			requestData.headers.Authorization = data.Authorization;
		}
		if(data.Range){
			requestData.headers.Range = data.Range;
		}
		return this.request(requestData, callback);
	}

	/**
	 * `b2_get_download_authorization` Used to generate an authorization token that can be used to download files with the specified prefix (and other optional headers) from a private B2 bucket. Returns an authorization token that can be passed to `b2_download_file_by_name` in the Authorization header or as an Authorization parameter.
	 * @param {Object} data Message Body Parameters.
	 * @param {String} data.bucketId The identifier for the bucket.
	 * @param {String} data.fileNamePrefix The file name prefix of files the download authorization token will allow `b2_download_file_by_name` to access.
	 * @param {Number} data.validDurationInSeconds The number of seconds before the authorization token will expire. The minimum value is 1 second. The maximum value is 604800 which is one week in seconds.
	 * @param {Number} [data.b2ContentDisposition] If this is present, download requests using the returned authorization must include the same value for b2ContentDisposition. The value must match the grammar specified in RFC 6266 (except that parameter names that contain an '*' are not allowed).
	 * @param {Function} [callback]
	 */
	getDownloadAuthorization(data, callback){
		return this.request({
			url: 'b2_get_download_authorization',
			method: 'POST',
			json: data
		}, callback);
	}

	/**
	 * `b2_hide_file` Hides a file so that downloading by name will not find the file, but previous versions of the file are still stored. See File Versions about what it means to hide a file.
	 * @param {Object} data Message Body Parameters.
	 * @param {String} data.bucketId The bucket containing the file to hide.
	 * @param {String} data.fileName The name of the file to hide.
	 * @param {Function} [callback]
	 */
	hideFile(data, callback){
		return this.request({
			url: 'b2_hide_file',
			method: 'POST',
			json: data
		}, callback);
	}

	/**
	 * Helper method: Request wrapper used to call Backblaze B2 API. All class methods consume this method internally.
	 * @param {object} data Options object. Matches the same of the [`request`](https://github.com/request/request) npm module. The options listed below are changed or modified for this api.
	 * @param {string} data.url URI path to append after the hostname, api path, and version.
	 * @param {boolean} data.appendPath (internal) When set to false will prevent extra URI and hostname changes. Most useful when combined with `apiUrl`
	 * @param {boolean} data.apiUrl (internal) Full URL path or hostname to replace. Most useful when combined with `appendPath`.
	 * @param {Function} callback [description]
	 */
	request(data, callback){
		const apiUrl = new url.URL(data.apiUrl || this.url);

		if(data.appendPath !== false){
			apiUrl.pathname += `b2api/${this.version}/${data.url}`;
		}
		const requestData = _.defaults(data, {
			method: 'get',
			json: true,
			headers: {}
		});
		requestData.url = apiUrl.toString();
		// if auth data is set from `authorize` function and we haven't overridden it via `data.auth` or request headers, set it for this request
		if(this.authData && !data.auth && !requestData.headers.Authorization){
			requestData.headers.Authorization = this.authData.authorizationToken;
		}
		requestData.headers.Accept = 'application/json';
		if(!requestData.headers.Authorization && !requestData.auth){
			return callback(new Error('Not yet authorised. Call `.authorize` before running any functions.'));
		}
		let reqCount = 0;
		const doRequest = () => {
			if(reqCount >= this.maxReauthAttempts){
				return callback(new Error('Auth token expired, and unable to re-authenticate to acquire new token.'));
			}
			reqCount++;
			return request(requestData, function(err, res, body){
				if(err){
					return callback(err);
				}
				// auth expired, re-authorize and then make request again
				if(res.statusCode === 401 && body && body.code === 'expired_auth_token'){
					return this.authorize(doRequest);
				}
				// todo: handle more response codes.
				if(res.statusCode !== 200){
					let error = null;
					if(typeof(body) === 'string'){
						error = new Error(body);
					}
					if(body.message){
						error = new Error(body.message);
					}
					if(!error){
						error = new Error('Invalid response from API.', body);
					}
					return callback(error, body);
				}
				if(res.headers['content-type'].includes('application/json') && typeof(body) === 'string'){
					body = JSON.parse(body);
				}
				return callback(null, body, res.statusCode);
			});
		};
		return doRequest();
	}

	/**
	 * Helper method: Gets sha1 hash from a file read stream.
	 * @private
	 * @param {Stream} fileStream File stream from `fs.readFileStream`.
	 * @param {Function} [callback]
	 */
	getHash(fileStream, callback){
		const hash = crypto.createHash('sha1');
		fileStream.on('data', function(chunk){
			hash.update(chunk);
		}).on('error', (err) => {
			return callback(err);
		}).on('end', function(){
			return callback(null, hash.digest('hex'));
		});
	}

	/**
	 * Helper method: Gets sha1 hash from a file.
	 * @private
	 * @param {String} Path to filename to get sha1 hash.
	 * @param {Function} [callback]
	 */
	getFileHash(filename, callback){
		return this.getHash(fs.createReadStream(filename), callback);
	}

	/**
	 * Helper method: Gets file stat info before upload.
	 * @private
	 * @param {String} Path to filename to get file stats.
	 * @param {Function} [callback]
	 */
	getStat(filename, callback){
		return fs.stat(filename, callback);
	}

	/**
	 * Helper method: Uploads a small file as a single part
	 * @private
	 * @param {String} filename Path to filename for upload.
	 * @param {Object} data Configuration data passed from the `uploadFile` method.
	 * @param {Function} [callback]
	 */
	uploadFileSmall(filename, data, callback = function(){}){
		let r = null,
			info = {};
		this.request({
			url: 'b2_get_upload_url',
			method: 'POST',
			json: {
				bucketId: data.bucketId
			}
		}, (err, results) => {
			if(err){ return callback(err); }

			let attempts = 0;
			const upload = () => {
				const requestData = {
					apiUrl: results.uploadUrl,
					appendPath: false,
					method: 'POST',
					json: false,
					headers: {
						'Authorization': results.authorizationToken,
						'Content-Type': data.contentType,
						'Content-Length': data.size,
						'X-Bz-File-Name': data.fileName,
						'X-Bz-Content-Sha1': data.hash
					},
					body: fs.createReadStream(filename)
				};
				data.info = _.defaults({
					'hash_sha1': data.hash
				}, data.info, {
					'src_last_modified_millis': data.stat.mtime.getTime()
				});
				_.each(data.info || {}, function(value, key){
					requestData.headers['X-Bz-Info-' + key] = value;
				});
				data.info = _.mapValues(data.info, _.toString);

				let interval = null;
				callback = _.once(callback);
				r = this.request(requestData, function(err, results, statusCode){
					attempts++;
					if(err){
						if(attempts > data.maxPartAttempts || attempts > data.maxTotalErrors){
							return callback(new Error('Exceeded max retry attempts for upload'));
						}
						if(statusCode === 500 || statusCode === 503){
							return upload();
						}
						return callback(err);
					}
					info.returnData = results;
					return callback(null, results);
				}).on('end', () => {
					clearInterval(interval);
				}).on('error', () => {
					clearInterval(interval);
				}).on('abort', () => {
					clearInterval(interval);
					return callback(new Error('B2 upload cancelled'));
				});
				interval = setInterval(function(){
					if(!data.onUploadProgress || typeof(data.onUploadProgress) !== 'function'){
						return;
					}
					let bytesDispatched = 0;
					if(r.req && r.req.connection && r.req.connection._bytesDispatched){
						bytesDispatched = r.req.connection._bytesDispatched;
					}
					const percent = Math.floor((bytesDispatched / data.size) * 100);
					info.progress = {
						percent: percent,
						bytesDispatched: bytesDispatched,
						bytesTotal: data.size
					};
					return data.onUploadProgress(info.progress);
				}, data.progressInterval || 250);
			};
			upload();
		});
		return {
			cancel: function(){
				if(r && r.abort){
					r.abort();
				}
			},
			progress: function(){
				return info.progress;
			},
			info: function(){
				return info.returnData;
			}
		};
	}

	/**
	 * Helper method: Uploads a large file as several parts
	 * This method will split the large files into several chunks & sha1 hash each part.
	 * These chunks are uploaded in parallel to B2 and will retry on fail.
	 * @private
	 * @param {String} filename Path to filename for upload.
	 * @param {Object} data Configuration data passed from the `uploadFile` method.
	 * @param {Function} [callback]
	 */
	uploadFileLarge(filename, data, callback = function(){}){
		const self = this;
		const info = {upload_urls: {}, totalErrors: 0};
		// TODO: handle update callbacks

		data.limit = data.limit || 4; // todo: calculate / dynamic or something

		let interval = null;
		async.series([
			function(cb){
				let fileInfo = _.defaults({
					large_file_sha1: data.hash,
					hash_sha1: data.hash
				}, data.info, {
					src_last_modified_millis: data.stat.mtime.getTime()
				});
				fileInfo = _.mapValues(fileInfo, _.toString);
				self.request({
					url: 'b2_start_large_file',
					method: 'POST',
					json: {
						bucketId: data.bucketId,
						fileName: data.fileName,
						contentType: data.contentType,
						fileInfo: fileInfo
					}
				}, (err, results) => {
					if(err){ return cb(err); }
					info.fileId = results.fileId;
					return cb();
				});
			},
			function(cb){
				async.times(data.limit, function(n, next){
					self.request({
						url: 'b2_get_upload_part_url',
						method: 'POST',
						json: {
							fileId: info.fileId
						}
					}, function(err, results){
						if(err){ return next(err); }
						info.upload_urls[n] = {
							uploadUrl: results.uploadUrl,
							authorizationToken: results.authorizationToken,
							in_use: false
						};
						return next();
					});
				}, cb);
			},
			function(cb){
				// todo: maybe tweak recommendedPartSize if the total number of chunks exceeds the total backblaze limit (10000)
				const partSize = data.partSize || self.authData.recommendedPartSize;

				// track the current chunk
				const fsOptions = {
					attempts: 1,
					part: 1,
					start: 0,
					size: partSize,
					end: partSize - 1,
					bytesDispatched: 0
				};
				info.chunks = [];
				info.lastPart = 1;
				// create array with calculated number of chunks (floored)
				const pushChunks = Array(Math.floor(data.size / partSize));
				_.each(pushChunks, function(){
					info.chunks.push(_.clone(fsOptions));
					fsOptions.part++;
					fsOptions.start += partSize;
					fsOptions.end += partSize;
				});
				// calculate remainder left (less than single chunk)
				const remainder = data.size % partSize;
				if(remainder > 0){
					const item = _.clone(fsOptions);
					item.end = data.size;
					item.size = remainder;
					info.chunks.push(item);
				}
				info.lastPart = fsOptions.part;

				return process.nextTick(cb);
			},
			function(cb){
				info.shaParts = {};
				info.totalUploaded = 0;

				const reQueue = function(task, incrementCount = true){
					if(incrementCount){
						task.attempts++;
					}
					queue.push(task);
				};
				const queue = async.queue(function(task, queueCB){
					// if the queue has already errored, just callback immediately
					if(info.error){
						return process.nextTick(queueCB);
					}
					// get upload url from available and mark it as in-use
					// re-queue if no url found (shouldn't ever happen)
					const url = _.find(info.upload_urls, {in_use: false});
					if(!url){
						return reQueue(task, false);
					}
					url.in_use = true;

					// create file hash stream
					const hashStream = fs.createReadStream(filename, {
						start: task.start,
						end: task.end,
						encoding: null
					});

					// get hash
					self.getHash(hashStream, function(err, hash){
						// if hash fails, error if exceeded max attempts, else requeue
						if(err){
							url.in_use = false;
							if(task.attempts > self.maxPartAttempts || info.totalErrors > self.maxTotalErrors){
								info.error = err;
								return queueCB(err);
							}
							info.totalErrors++;
							reQueue(task);
							return queueCB();
						}

						// create file stream for upload
						const fileStream = fs.createReadStream(filename, {
							start: task.start,
							end: task.end,
							encoding: null
						});
						queueCB = _.once(queueCB);
						url.request = self.request({
							apiUrl: url.uploadUrl,
							appendPath: false,
							method: 'POST',
							json: false,
							headers: {
								'Authorization': url.authorizationToken,
								'X-Bz-Part-Number': task.part,
								'X-Bz-Content-Sha1': hash,
								'Content-Length': task.size
							},
							body: fileStream
						}, function(err){
							// release upload url
							url.in_use = false;
							url.request = null;
							// if upload fails, error if exceeded max attempts, else requeue
							if(err){
								// push back to queue
								if(task.attempts > self.maxPartAttempts || info.totalErrors > self.maxTotalErrors){
									info.error = err;
									return queueCB(err);
								}
								info.totalErrors++;
								reQueue(task);
								return queueCB();
							}
							info.shaParts[task.part] = hash;
							info.totalUploaded += task.size;
							return queueCB();
						}).on('abort', () => {
							return queueCB();
						});
					});
				}, _.size(info.upload_urls));

				// callback when queue has completed
				queue.drain = function(){
					clearInterval(interval);
					if(info.error){
						return cb();
					}
					info.partSha1Array = [];
					let i = 1;
					while(i <= info.lastPart){
						info.partSha1Array.push(info.shaParts[i++]);
					}
					return cb();
				};
				interval = setInterval(function(){
					if(!data.onUploadProgress || typeof(data.onUploadProgress) !== 'function'){
						return;
					}
					let bytesDispatched = 0;
					bytesDispatched = _.sumBy(Object.values(info.upload_urls), function(url){
						if(url && url.request && url.request.req && url.request.req.connection && url.request.req.connection._bytesDispatched){
							return url.request.req.connection._bytesDispatched;
						}
						return 0;
					});
					bytesDispatched += info.totalUploaded;
					const percent = Math.floor((bytesDispatched / data.size) * 100);
					return data.onUploadProgress({
						percent: percent,
						bytesDispatched: bytesDispatched,
						bytesTotal: data.size
					});
				}, data.progressInterval || 250);

				queue.push(info.chunks);
			},
			function(cb){
				if(interval){ clearInterval(interval); }

				// cleanup large file upload if error occurred
				if(!info.error){ return cb(); }

				return self.request({
					url: 'b2_cancel_large_file',
					method: 'POST',
					json: {
						fileId: info.fileId
					}
				}, cb);
			},
			function(cb){
				if(info.error){ return cb(info.error); }
				self.request({
					url: 'b2_finish_large_file',
					method: 'POST',
					json: {
						fileId: info.fileId,
						partSha1Array: info.partSha1Array
					}
				}, function(err, results){
					if(err){ return cb(err); }
					info.returnData = results;
					return cb();
				});
			}
		], function(err){
			if(interval){ clearInterval(interval); }
			if(err || info.error){ return callback(err || info.error); }
			return callback(null, info.returnData);
		});
		return {
			cancel: function(){
				info.error = new Error('B2 upload cancelled');
				_.each(info.upload_urls, function(url){
					if(url.request && url.request.abort){
						url.request.abort();
					}
				});
			},
			progress: function(){
				return info.progress;
			},
			info: function(){
				if(info.returnData){
					return info.returnData;
				}
				return {fileId: info.fileId};
			}
		};
	}
};

module.exports = b2CloudStorage;