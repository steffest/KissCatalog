var Scanner = function(){
	// Scans a Filesystem tree and put it into a JSON structure
	var me = {};

	var fs = require('fs');
	
	var queue;
	var onDone;
	var collectionData;
	var config;

	me.init = function(_config,next){
		console.log("Updating database");
		config = _config;
		collectionData = {name: config.collectionName , path: ""};
		queue = [collectionData];
		onDone = next;
		scan();
	};

	function scan(){
		if (queue.length){
			var node = queue.shift();
			//console.log(node);
			node.files = node.files || [];
			node.folders = node.folders || [];
			node.images = node.images || [];
			//console.log(node.path);
			fs.readdir(config.collectionPath + node.path, (err, files) => {
				if (files){
					files.forEach(file => {
						if (file.indexOf(".") !== 0){
							var thisPath = node.path + "/" + file;
							var stats = fs.lstatSync(config.collectionPath + thisPath);
							var item = {
								name: file,
								lastModified: stats.mtime,
								created: stats.birthtime,
								path: thisPath
							};

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
											var contents = fs.readFileSync(config.collectionPath + node.path + "/" + file, 'utf8');
											node.info = contents;
											// also add info.txt to files, it's used to calculate the last modified date of the parent folder
										}

										node.files.push(item);
									}

								} else if (stats.isDirectory()){
									//console.log(file);
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
		var dbPath = "db.json" ;
		if (!config.isRunningPackaged) dbPath = "client/_data/" + dbPath;
		fs.writeFile(dbPath, JSON.stringify(collectionData,null,2), function(err) {
			console.log(err ? err : "done");
			if (onDone) onDone(collectionData);
		});
	}

	return me;
}();

module.exports = Scanner;