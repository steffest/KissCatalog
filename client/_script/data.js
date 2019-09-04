var DataProvider = function(){
	var me = {};
	var state = {};
	var collection;
	var flatFolders;
	var flatFiles;
	var currentCollection;
	
	me.load = function(next){
		FetchService.json(Config.dataUrl + "?r=" + Math.random(),function(result){
			collection = result;
			buildFlatFolders();
			if (next) next(collection);
		});
	};
	
	me.refresh = function(next){
		FetchService.json("refresh",function(result){
			if (result){
				collection = result;
				buildFlatFolders();
				if (next) next();
			}
		})	
	};
	
	me.updateInfo = function(){
		var url = "/updateinfo/";
		var data = {
			path: currentCollection.path,
			content: currentCollection.info
		};
		FetchService.post(url,JSON.stringify(data),function(result){
			console.error(result);
		})
	};
	
	me.uploadFile = function(file,next){
		var reader = new FileReader();
		reader.onload = function(){
			var data = {
				filename: file.name,
				path: currentCollection.path
			};

			FetchService.post("/uploadinit/",JSON.stringify(data),function(result){
				result = parseJson(result);
				if (result.accepted){
					FetchService.postBinary("/upload/" + result.id,reader.result,function(result){
						next({success:result === "ok"});
					});
				}else{
					next({success:false, error:"Files of this type are not allowed"});
				}
			});



			//refreshFolder();
		};
		reader.readAsArrayBuffer(file);
	};
	
	me.deleteFile = function(filename,path,next){
		var data = {
			path: path || currentCollection.path,
			filename: filename
		};
		FetchService.post("/delete",JSON.stringify(data),function(result){
			console.log(result);
			next({success:result === "ok"});
		});
	};

	me.renameFile = function(filename,newfilename,path,next){
		var data = {
			path: path || currentCollection.path,
			filename: filename,
			newfilename: newfilename
		};
		FetchService.post("/rename",JSON.stringify(data),function(result){
			console.log(result);
			next({success:result === "ok"});
		});
	};

	me.moveFile = function(path,newpath,next){
		var data = {
			path: path || currentCollection.path,
			newpath: newpath
		};

		FetchService.post("/move",JSON.stringify(data),function(result){
			console.log(result);
			next({success:result === "ok"});
		});
	};

	me.addSubFolder = function(name,next){
		var data = {
			path: currentCollection.path,
			filename: name
		};
		FetchService.post("/createfolder",JSON.stringify(data),function(result){
			console.log(result);
			next({success:result === "ok"});
		});
	};

	me.prepareFile = function(filename,path,next){
		var data = {
			filename: filename,
			path: path || currentCollection.path
		};

		FetchService.post("/uploadinit/",JSON.stringify(data),function(result){
			result = parseJson(result);
			if (result.accepted){
				result.success=true;
				next(result);
			}else{
				next({success:false, error:"Files of this type are not allowed"});
			}
		});
	};

	me.updateConfig = function(data,next){
		FetchService.post("/updateconfig",JSON.stringify(data),function(result){
			console.log(result);
			next({success:result === "ok"});
		});
	};

	me.login = function(logindata,next){
		FetchService.get("/challenge",function(challenge){
			if (challenge){
				var data = {
					challenge: challenge,
					response: md5(challenge + "_" + md5(logindata.password))
				};
				FetchService.post("/login",JSON.stringify(data),function(result){
					next({success:result === "ok"});
				});
			}else{
				next({success:false});
			}
		});
	};

	me.quit = function(next){
		FetchService.post("/quit","",function(result){
			console.log(result);
			next({success:result === "ok"});
		});
	};
	
	me.setState = function(key,value){
		state[key] = value;
	};
	
	me.getState = function(key){
		return state[key];	
	};

    me.getCollection = function(){
        return collection;
    };

    me.getCollectionByPath = function(path){
        path = (path || "").toLowerCase();
        var parts = path.split("/");
        var result = collection;
        parts.forEach(function(item){
            if (item && result) result = result.folders.find(function(elm){ return elm.name.toLowerCase() === item})
        });
        return result;
    };
	
	me.getCurrentCollection = function(){
		return currentCollection;
	};
	
	me.setCurrentCollection = function(collection,silent){
		currentCollection = collection;
		if (!silent) EventBus.trigger(EVENT.COLLECTION_CHANGE);
	};

	me.getLastModified = function(){
        flatFolders.sort(function(a,b){return a.contentModified>b.contentModified?-1:(a.contentModified<b.contentModified?1:0)});
        return flatFolders;
    };
    me.getLastAdded = function(){
        flatFolders.sort(function(a,b){return a.created>b.created?-1:(a.created<b.created?1:0)});
        return flatFolders;
    };

	me.parseProperties = function(info,parseAll){
		var properties = {list: []};

		var lines = info.split('\n');

		if (Config.properties && Config.properties.length){
			Config.properties.forEach(function(property){
				_property = property.name.toLowerCase() + ":";
				var found = false;
				lines.forEach(function (line,index) {
					_line = line.toLowerCase();
					if (_line.indexOf(_property) === 0){
						found = true;
						line = line.substr(property.name.length + 1);
						line = line.trim();
						properties.list.push({name: property.name, value: line, type: property.type, private: !!property.private});
						lines.splice(index, 1);
					}
				});
				if (!found && parseAll){
					properties.list.push({name: property.name, value: "", type: property.type})
				}
			});
		}

		properties.info = lines.join('\n');

		return properties;

	};

    me.rebuildInfo = function(collection){
		collection.info = collection.displayInfo || collection.info;
		Config.properties.forEach(function(property){
			var this_property = collection.properties.find(function(item){return item.name === property.name});
			if (this_property && this_property.value){
				collection.info = this_property.name + ": " + this_property.value + '\n' + collection.info;
			}
		});
	};

    me.generateExtendedInfo = function(collection){
		if (!collection.visibleFiles && collection.files){
			collection.visibleFiles = [];
			collection.files.forEach(function(file){
				if (file.name !== "info.txt"){
					collection.visibleFiles.push(file);
				}
				file.private = !!file.private;
			})
		}
	};

	me.clearCollectionCache = function(collection){
		collection.visibleFiles = undefined;
		collection.footerinfo = undefined;
		collection.properties = undefined;
		collection.infoHTML = undefined;
		collection.displayInfo = undefined;
	};
    
    function getDisplayName(item){
    	return item.private?item.name.replace("_private",""):item.name;
	}
    
	function buildFlatFolders(){
        flatFolders  = [];

        function scan(parent){
            if (parent.folders){
                parent.folders.forEach(function(item){

                    item.contentModified = item.lastModified;
                    if (item.files){
                        item.files.forEach(function(file){
                            if (file.lastModified>item.contentModified) item.contentModified=file.lastModified;
                        })
                    }

					item.displayName = getDisplayName(item);

                    flatFolders.push(item);
                    scan(item);
                });

				if (parent.images){
					parent.images.forEach(function(file){
						file.displayName = getDisplayName(file);
					})
				}

				if (parent.files){
					parent.files.forEach(function(file){
						file.displayName = getDisplayName(file);
					})
				}

				parent.displayName = getDisplayName(parent);
            }
        }
        scan(collection);



    }

	function parseJson(s){
		if (typeof s === "string"){
			var result;
			try{
				result = JSON.parse(s);
			}catch (e) {
				result={}
			}
			return result;
		}else{
			return s;
		}
		
	}
	
	return me;
}();