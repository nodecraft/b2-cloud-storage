'use strict';
const url = require('url'),
	crypto = require('crypto'),
	fs = require('fs');

const request = require('request'),
	_ = require('lodash'),
	async = require('async');

const b2Upload = class {
	constructor(data){
		if(!data || !data.auth){
			throw new Error('Missing authentication object');
		}
		if(!data.auth.accountId){
			throw new Error('Missing authentication accountId');
		}
		if(!data.auth.applicationKey){
			throw new Error('Missing authentication applicationKey');
		}

		this.maxSmallFileSize = data.maxSmallFileSize || 100000000;
		if(this.maxSmallFileSize > 5000000000){
			throw new Error('maxSmallFileSize can not exceed 5GB');
		}
		if(this.maxSmallFileSize < 100000000){
			throw new Error('maxSmallFileSize can not be less than 100MB');
		}

		this.auth = data.auth;
		this.url = data.url || 'https://api.backblazeb2.com';
		this.version = data.version || 'v2';
		this.maxPartAttempts = data.maxPartAttempts || 3; // retry each chunk up to 3 times
		this.maxTotalErrors = data.maxTotalErrors || 10; // quit if 10 chunks fail
	}

	request(data, callback){
		const apiUrl = new url.URL(data.apiUrl || this.url);

		if(data.appendPath !== false){
			apiUrl.pathname += `/b2api/${this.version}/${data.url}`;
		}
		const requestData = _.defaults(data, {
			method: 'get',
			json: true,
			headers: {}
		});
		requestData.url = apiUrl.toString();
		// if auth data is set from `authorize` function and we haven't overriden it via `data.auth` or request headers, set it for this request
		if(this.authData && !data.auth && !requestData.headers.Authorization){
			requestData.headers.Authorization = this.authData.authorizationToken;
		}
		requestData.headers.Accept = 'application/json';
		if(!requestData.headers.Authorization && !requestData.auth){
			return callback(new Error('Not yet authorised. Call `.authorize` before running any functions.'));
		}
		return request(requestData, function(err, res, body){
			if(err){
				return callback(err);
			}
			// todo: handle unauthorized, etc.
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
				return callback(error);
			}
			if(res.headers['content-type'].includes('application/json') && typeof(body) === 'string'){
				body = JSON.parse(body);
			}
			return callback(null, body, res.statusCode);
		});
	}

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

	getFileHash(filename, data, callback){
		if(data.hash){
			return callback(null, data.hash);
		}
		const fileStream = fs.createReadStream(filename);
		return this.getHash(fileStream, callback);
	}

	getStat(filename, callback){
		fs.stat(filename, function(err, results){
			if(err){ return callback(err); }
			return callback(null, results);
		});
	}

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
					console.error('req error');
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
			},
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
	uploadFile(filename, data, callback = function(){}){
		// data.bucketId
		// data.fileName
		// data.contentType
		// data.hash // sha-1
		// data.info // metadata
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
				self.getFileHash(filename, data, function(err, hash){
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
	listParts(data, callback){
		return this.request({
			url: 'b2_list_parts',
			method: 'POST',
			json: data
		}, callback);
	}
	listUnfinishedLargeFiles(data, callback){
		return this.request({
			url: 'b2_list_unfinished_large_files',
			method: 'POST',
			json: data
		}, callback);
	}
	getFileInfo(fileId, callback){
		return this.request({
			url: 'b2_get_file_info',
			method: 'POST',
			json: {
				fileId
			}
		}, callback);
	}
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
	listFileNames(data, callback){
		return this.request({
			url: 'b2_list_file_names',
			method: 'POST',
			json: data
		}, callback);
	}
	listFileVersions(data, callback){
		return this.request({
			url: 'b2_list_file_versions',
			method: 'POST',
			json: data
		}, callback);
	}
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
	deleteFileVersion(data, callback){
		return this.request({
			url: 'b2_delete_file_version',
			method: 'POST',
			json: data
		}, callback);
	}
	// todo: greatly improve download functions
	downloadFileById(data, callback){
		return this.request({
			url: 'b2_download_file_by_id',
			method: 'GET',
			qs: data
		}, callback);
	}
	// todo: greatly improve authorization magic
	downloadFileByName(data, callback){
		const requestData = {
			url: `${data.downloadUrl}/file/${data.bucket}/${data.fileId}`,
			method: 'GET',
			json: data
		};
		if(data.auth){
			requestData.headers = {Authorization: data.auth};
		}
		return this.request(requestData, callback);
	}
	getDownloadAuthorization(data, callback){
		return this.request({
			url: 'b2_get_download_authorization',
			method: 'POST',
			json: data
		}, callback);
	}
	hideFile(data, callback){
		return this.request({
			url: 'b2_hide_file',
			method: 'POST',
			json: data
		}, callback);
	}
};

module.exports = b2Upload;