var HTTPserver = function(){
	// simple HTTP server to serve UI - optional, but handy for local use
	var me = {};

	var fs = require('fs');
	var http = require('http');
	var path = require('path');
	var util = require('./util.js');
	var auth = require('./auth.js');
	var scanner = require("./scanner.js");
	var logger = require("./logger.js");

	// allowed file extensions
	let mimeTypes = {
		'.html': {isBinary: false, type: 'text/html'},
		'.txt':  {isBinary: false, type: 'text/plain'},
		'.css':  {isBinary: false, type: 'text/css'},
		'.js':   {isBinary: false, type: 'text/javascript'},
		'.json': {isBinary: false, type: 'application/json'},
		'.jpg':  {isBinary: true, type: 'image/jpeg'},
		'.png':  {isBinary: true, type: 'image/png'},
		'.ico':  {isBinary: true, type: 'image/x-icon'},
		'.svg':  {isBinary: true, type: 'image/svg+xml'},
		'.eot':  {isBinary: true, type: 'appliaction/vnd.ms-fontobject'},
		'.ttf':  {isBinary: true, type: 'aplication/font-sfnt'},
		'.woff':  {isBinary: true, type: 'application/font-woff'},
		'.woff2':  {isBinary: true, type: 'application/font-woff2'},
		'.zip':  {isBinary: true, type: 'application/octet-stream'},
		'.pdf':  {isBinary: true, type: 'application/pdf'}
	};

	let allowedFileUploadExtentions = [".jpg",".jpeg",".png","gif",".svg",".zip",".txt",".pdf",".mp3",".mp4",".wav",".lha",".rar"];
	var uploadCodes = {};

	me.init = function(config){
		var server = http.createServer(function (req, res) {

			var reqUrl = req.url;
			reqUrl = reqUrl.split("?")[0];

			var parts = reqUrl.split("/");

			var action = parts[1] || "index";
			var param = parts[2] || "";
			var param2 = parts[3] || "";
			var page = parts[4] || 1;

			var handled = false;

			if (req.method === "GET") {

				if (action === "index"){
					handled = true;
					fs.readFile(config.clientPath + "index.html",function(err,content){
						res.writeHead(200, {'Content-Type': mimeTypes['.html']});
						res.end(content);
					});
				}

				if (action === "_data"){
					
					if (param === "config.json"){
						// this overrides the static file so the frontend knows there's an active backend running and can switch in edit mode.
						res.writeHead(200, {'Content-Type': mimeTypes['.json']});
						config.hasBackend = true;
						config.isAuthenticated = auth.isAuthenticated(req,res);
						config.hasCollection = !!config.collectionPath;
						res.end(JSON.stringify(config));
						return;
					}

					if (param === "db.json"){
						//serveStatic(param,res,config.dataPath);

						res.writeHead(200, {'Content-Type': mimeTypes['.json']});
						res.end(JSON.stringify(scanner.getData(auth.isAuthenticated(req,res))));
						
						
						return;
					}
				}

				if (action.substr(0,1) === "_"){
					handled = true;
					param = reqUrl.split("..").join("");
					serveStatic(param,res);
				}

				var serveCollectionEndPoint = "collection";
				if (action === serveCollectionEndPoint){
					handled = true;
					param = reqUrl.substr(serveCollectionEndPoint.length+2).split("..").join("");
					serveStatic(param,res, config.fullcollectionPath);
				}

				if (action === "refresh"){
					handled = true;
					scanner.init(config,function(result){
						res.writeHead(200, {'Content-Type': mimeTypes['.json']});
						res.end(JSON.stringify(result));
					});
				}

				if (action === "challenge"){
					handled = true;
					res.end(new Date().getTime().toString());
				}

			}else if(req.method === "POST") {

				var isAuthenticated = auth.isAuthenticated(req,res);

				if (action === "login"){
					handled = true;
					parseBody(body => {
						var user = {};
						try{
							user = fs.readFileSync("users.json");
							user = JSON.parse(user);
						}catch (e) {
							user = {}
						}
						var challenge =  body.challenge;
						auth.login(body,user,req,res,function(result){
							res.end(result ? "ok" : "error");
						});
					});
				}

				if (!isAuthenticated && !handled){
					handled = true;
					res.writeHead(403, {'Content-Type': 'text/html'});
					res.end("Forbidden");
					action="";
					return;
				}

				function parseBody(next){
					let body = '';
					req.on('data', chunk => {
						body += chunk.toString();
					});
					req.on('end', () => {
						body = util.parseJson(body);
						next(body);
					});
				}

				if (action === "updateinfo"){
					handled = true;
					parseBody(body => {
						var filePath =  util.cleanPath(config.fullcollectionPath + body.path + "/info.txt");
						fs.writeFile(filePath, body.content, "utf8" ,(err) => {
							if (err){
								logger.error("Error writing to file " + filePath);
								res.end("error");
							}else{
								res.end("ok");
							}
						});
					});
				}

				if (action === "uploadinit"){
					handled = true;
					parseBody(body => {
						if (body && body.filename){
							var result = {accepted: false};
							var ext = "." + body.filename.split(".").pop().toLowerCase();
							logger.info("file check: " + ext);
							if (allowedFileUploadExtentions.indexOf(ext)>=0){
								result.accepted=true;
								result.id = Object.keys(uploadCodes).length + "_" + Math.round(Math.random()*1000000);
								uploadCodes[result.id] = body;
							}
						}
						res.writeHead(200, {'Content-Type': mimeTypes['.json']});
						res.end(JSON.stringify(result));
					});
				}

				if (action === "upload"){
					handled = true;
					var fileInfo = uploadCodes[param];
					if (fileInfo){
						var filePath =  util.cleanPath(config.fullcollectionPath + fileInfo.path + "/" + util.cleanFilename(fileInfo.filename));
						logger.info("Saving to " + filePath);
						
						try{
							var dst = fs.createWriteStream(filePath);
							req.pipe(dst);
							req.on('end', function () {
								res.end('ok');
							});
						}catch(e){
							logger.error("error saving file " + filePath);
							res.end('error');
						}
					}else{
						res.end('invalid upload');
					}
				}

				if (action === "uploadbase64"){
					handled = true;
					var fileInfo = uploadCodes[param];
					if (fileInfo){
						parseBody(body => {

							var filePath =  util.cleanPath(config.fullcollectionPath + fileInfo.path + "/" + util.cleanFilename(fileInfo.filename));
							
							if (body.saveas){
								fileInfo.filename = fileInfo.filename.replace(".","_2.");
								filePath =  util.cleanPath(config.fullcollectionPath + fileInfo.path + "/" + util.cleanFilename(fileInfo.filename));
								if (fs.existsSync(filePath)){
									fileInfo.filename = fileInfo.filename.replace("_2.","_"+ new Date().getTime() +".");
									filePath =  util.cleanPath(config.fullcollectionPath + fileInfo.path + "/" + util.cleanFilename(fileInfo.filename));
								}
							}
							
							logger.info("Saving to " + filePath);
							
							
							try{
								var base64Data = body.img.split(';base64,').pop();

								fs.writeFile(filePath, base64Data, {encoding: 'base64'}, function(err) {
									res.writeHead(200, {'Content-Type': mimeTypes['.json']});
									res.end(JSON.stringify({
										success: !err,
										redirectUrl : "/#/" + fileInfo.path
									}));
									
									if (body.saveas){
										console.log("refreshing database");
										scanner.init(config);
									}
								});
								
							}catch(e){
								logger.error("error saving file " + filePath);
								res.end('error');
							}
							
						});
					}else{
						res.end('invalid upload');
					}
				}

				if (action === "delete"){
					handled = true;
					parseBody(body => {
						var filePath =  util.cleanPath(config.fullcollectionPath + body.path + "/" + body.filename);
						var targetPath =  filePath + "." + new Date().getTime() + ".deleted";
						fs.rename(filePath, targetPath, function(err){
							if (err){
								logger.error("Failed to delete file or folder folderPath" + targetPath);
								res.end('error');
							}else{
								res.end('ok');
							}
						});
					});
				}

				if (action === "rename"){
					handled = true;
					parseBody(body => {
						var filePath =  util.cleanPath(config.fullcollectionPath + body.path + "/" + body.filename);
						var targetPath =  util.cleanPath(config.fullcollectionPath + body.path + "/" + util.cleanFilename(body.newfilename));
						logger.info("rename " + filePath + " to " + targetPath);
						fs.rename(filePath, targetPath, function(err){
							if (err){
								logger.error("Failed to rename file or folder folderPath" + targetPath);
								res.end('error');
							}else{
								res.end('ok');
							}
						});
					});
				}

				if (action === "createfolder"){
					handled = true;
					parseBody(body => {
						var folderPath =  util.cleanPath(config.fullcollectionPath + body.path + "/" + body.filename);
						fs.mkdir(folderPath,function(err){
							if (err){
								logger.error("Failed to create folder folderPath" + folderPath);
								res.end('error');
							}else{
								res.end('ok');
							}
						});
					});
				}

				if (action === "updateconfig"){
					logger.info("Updating config");
					handled = true;
					parseBody(body => {
						let configPath = config.dataPath + "config.json";
						try{
							var userConfig = fs.readFileSync(configPath);
							userConfig = JSON.parse(userConfig.toString());
						}catch (e) {
							userConfig = {};
						}

						var password = "";
						for (let key in body){
							var include = true;
							if (key === "password"){
								password = body[key];
								include = false;
							}
							if (include) userConfig[key] = body[key];
						}
						
						if (!userConfig.collectionPath) userConfig.collectionPath = "client/collection/";
						if (!userConfig.collectionName) userConfig.collectionName = "Collection";
						if (!userConfig.port) userConfig.port = 4303;
						userConfig.port = parseInt(userConfig.port);
						if (isNaN(userConfig.port)) userConfig.port = 4303;
						userConfig.hasCollection = true;
						
						for (let key in userConfig){config[key] = userConfig[key]};

						config.fullcollectionPath = config.collectionPath;
						if (!util.isFullPath(config.fullcollectionPath)) config.fullcollectionPath =  config.appDir + config.fullcollectionPath;
						config.fullcollectionPath = util.addSlash(config.fullcollectionPath);
						
						logger.info("Collection path is now " + config.fullcollectionPath);
						logger.info("writing config to " + configPath);

						if (password !== "dummy"){
							var filename = "users.json";
							if (password === ""){
								if (fs.existsSync(filename))
								try{fs.unlink(filename,function(err){
									if (err){
										logger.info("error removing password...");
									}else{
										logger.info("password removed.");
									}})}catch (e){logger.error("error removing password...");}
							}else{
								// the password is stored (as hash) in the same dir as the main server - don't expose this if you put this on a public server ...
								fs.writeFile(filename,JSON.stringify({user: password}),"utf8",function(err){logger.info("password updated");});
							}

						}
						
						fs.writeFile(configPath,JSON.stringify(userConfig,null,2),"utf8",function(err){
							if (!err){
								scanner.init(config,function(){
									res.end("ok");
								});
							}else{
								res.end("error");
							}
						})
					});
				}


				if (action === "quit"){
					res.end("ok");
					console.log("Shutting down ...");
					setTimeout(function(){
						process.exit();
					},1000)
					
				}
			}

			if (!handled){
				res.writeHead(404, {'Content-Type': 'text/html'});
				res.end("unkown action");
			}
			
		}).listen(config.port);


		function serveStatic(fileName,res,rootPath){
			fileName = decodeURIComponent(fileName);
			var ext = path.extname(fileName).toLowerCase();
			var mimeType = mimeTypes[ext];
			rootPath = rootPath || config.clientPath;

			if (mimeType){
				if(mimeType.isBinary)
				{
					try{
						var file = fs.readFileSync(rootPath + fileName);
						res.writeHead(200, {'Content-Type': mimeType.type});
						res.write(file, 'binary');
						res.end();
					}catch (e) {
						res.writeHead(404, {'Content-Type': 'text/html;charset=utf8'});
						res.write("File is not found.");
					}
				}else {
					fs.readFile(rootPath + fileName, 'utf8', function (err, data) {
						if(!err){
							res.writeHead(200, {'Content-Type': mimeType.type});
							res.end(data);
						}else {
							console.log(rootPath + fileName);
							res.writeHead(404, {'Content-Type': 'text/html;charset=utf8'});
							res.write("File is not found.");
						}
						res.end();
					});
				}
			}else{
				res.writeHead(403, {'Content-Type': 'text/html;charset=utf8'});
				res.write("File of type "+ext+" not allowed.");
				res.end();
			}
		}
	};

	return me;
}();

module.exports = HTTPserver;