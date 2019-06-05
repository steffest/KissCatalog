var Scanner = function(){
	// Scans a Filesystem tree and put it into a JSON structure
	var me = {};

	var fs = require('fs');
	var logger = require('./logger.js');
	
	var queue;
	var onDone;
	var collectionData;
	var collectionDataPublic;
	var config;
	var hasPrivate;

	me.init = function(_config,next){
		logger.info("Updating database");
		config = _config;
		collectionData = {name: config.collectionName , path: ""};
		hasPrivate = false;
		queue = [collectionData];
		onDone = next;
		scan();
	};
	
	me.getData = function(authenticated){
		return (authenticated ? collectionData : collectionDataPublic);
	};

	function scan(){
		if (queue.length){
			var node = queue.shift();
			node.files = node.files || [];
			node.folders = node.folders || [];
			node.images = node.images || [];
			
			fs.readdir(config.fullcollectionPath + node.path, (err, files) => {
				if (files){
					files.forEach(file => {
						if (file.indexOf(".") !== 0){
							var thisPath = node.path + "/" + file;
							var stats = fs.lstatSync(config.fullcollectionPath + thisPath);
							var item = {
								name: file,
								lastModified: stats.mtime,
								created: stats.birthtime,
								path: thisPath
							};
							
							if (file.indexOf("_private")>0){
								item.private = true;
								hasPrivate = true;
							}

							var ext = file.split(".").pop().toLowerCase();

							if (ext !== "deleted"){
								if (stats.isFile()){
									if (["jpg","jpeg","png"].indexOf(ext)>=0){
										var name = file.split(".")[0].toLowerCase();
										if (name === "main" || name === node.name.toLowerCase()){
											node.mainImage = file;
										}else{
											node.images.push(item);
										}
									}else{
										if (file == "info.txt"){
											var contents = fs.readFileSync(config.fullcollectionPath + node.path + "/" + file, 'utf8');
											node.info = contents;
											// also add info.txt to files, it's used to calculate the last modified date of the parent folder
										}

										node.files.push(item);
									}

								} else if (stats.isDirectory()){
									node.folders.push(item);
									queue.push(item);
								}
							}

						}
					});

					if (!node.mainImage && node.images && node.images.length) node.mainImage =  node.images[0].name;
				}
				scan();
			});
		}else{
			done();
		}
	}

	function done(){
		
		console.log("hasPrivate: " + hasPrivate);

		collectionDataPublic = hasPrivate ? copyPublic(collectionData) : collectionData;
		
		var dbPath = config.dataPath + "db.json" ;
		fs.writeFile(dbPath, JSON.stringify(collectionDataPublic,null,2), function(err) {
			logger.info(err ? err : "done");
			if (onDone) onDone(collectionData);
		});
	}

	function copyPublic(node){
		var item = {
			files:[],
			folders:[],
			images:[]
		};
		Object.keys(node).forEach(function(key){
			switch (key) {
				case "files":
					node.files.forEach(function(file){
						if (!file.private) item.files.push(file);
					});
					break;
				case "images":
					node.images.forEach(function(file){
						if (!file.private) item.images.push(file);
					});
					break;
				case "folders":
					node.folders.forEach(function(folder){
						if (!folder.private) item.folders.push(copyPublic(folder));
					});
					break;
				default:
					item[key] = node[key];
			}
		});
		return item;
	}

	return me;
}();

module.exports = Scanner;