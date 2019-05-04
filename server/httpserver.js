var HTTPserver = function(){
	// simple HTTP server to serve UI - optional, but handy for local use
	var me = {};

	var fs = require('fs');
	var http = require('http');
	var path = require('path');
	var util = require('./util.js');
	var scanner = require("./scanner.js");

	// allowed file extensions
	let mimeTypes = {
		'.html': {isBinary: false, type: 'text/html'},
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

	let allowedFileUploadExtentions = [".jpg",".jpeg",".png","gif",".zip",".txt",".pdf",".mp3"];
	var uploadCodes = {};

	me.init = function(config){
		http.createServer(function (req, res) {

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
						config.hasCollection = !!config.collectionPath;
						res.end(JSON.stringify(config));
						return;
					}

					if (param === "db.json"){
						serveStatic(param,res,config.dataPath);
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




			}else if(req.method === "POST") {

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
								console.log("Error writing to file " + filePath);
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
							console.log("file check: " + ext);
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
						var filePath =  util.cleanPath(config.fullcollectionPath + fileInfo.path + "/" + fileInfo.filename);
						console.log("Saving to " + filePath);
						var dst = fs.createWriteStream(filePath);
						req.pipe(dst);
						req.on('end', function () {
							res.end('ok');
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
								console.log("Failed to delete file or folder folderPath" + targetPath);
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
						console.log("rename " + filePath + " to " + targetPath);
						fs.rename(filePath, targetPath, function(err){
							if (err){
								console.log("Failed to rename file or folder folderPath" + targetPath);
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
								console.log("Failed to create folder folderPath" + folderPath);
								res.end('error');
							}else{
								res.end('ok');
							}
						});
					});
				}

				if (action === "updateconfig"){
					console.log("Updating config");
					handled = true;
					parseBody(body => {
						let configPath = config.dataPath + "config.json";
						try{
							var userConfig = fs.readFileSync(configPath);
							userConfig = JSON.parse(userConfig.toString());
						}catch (e) {
							userConfig = {};
						}

						for (let key in body){userConfig[key] = body[key]};
						
						if (!userConfig.collectionPath) userConfig.collectionPath = "client/collection/";
						if (!userConfig.collectionName) userConfig.collectionName = "Collection";
						if (!userConfig.port) userConfig.port = 4303;
						userConfig.port = parseInt(userConfig.port);
						if (isNaN(userConfig.port)) userConfig.port = 4303;
						
						for (let key in userConfig){config[key] = userConfig[key]};

						config.fullcollectionPath = config.collectionPath;
						if (!util.isFullPath(config.fullcollectionPath)) config.fullcollectionPath =  config.appDir + config.fullcollectionPath;
						config.fullcollectionPath = util.addSlash(config.fullcollectionPath);
						
						console.log("Collection path is now " + config.fullcollectionPath);
						console.log("writing config to " + configPath);
						
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