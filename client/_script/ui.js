var UI = function(){
	var me = {};
	var collectionContainer;
	var breadCrumb;
	var menu;
	var menubutton;
	var searchContainer;
	var searchResultsContainer;
	var searchInput;
	var footer;
	var optionsContainer;
	var editor;
	var blanket;
	var dialog;

	me.init = function(next){
		collectionContainer = document.getElementById("collection");
		breadCrumb = document.getElementById("breadcrumb");
		menu = document.getElementById("menu");
		menubutton = document.getElementById("menubutton");
		searchContainer = document.getElementById("searchbar");
		searchResultsContainer = document.getElementById("searchresults");
		searchInput = document.getElementById("searchinput");
		footer = document.getElementById("footer");
		optionsContainer = document.getElementById("options");
		blanket = document.getElementById("blanket");
		dialog = document.getElementById("dialog");

		FetchService.json("_data/config.json",function(result){
			if (result){
				for (var key in result){
					Config[key] = result[key];
				}
			}
			
			Config.hasBackend = !!Config.hasBackend;
			renderFooter();
			renderOptions();
			
			if (!Config.hasBackend){
				document.body.classList.add("static");
			}
			
			if (next) next();
		})
	};
	
	me.toggleOption = function(elm){
		elm.classList.toggle("active");
		Config[elm.dataset.option] = elm.classList.contains("active");
		localStorage.setItem("kiss-" + [elm.dataset.option],Config[elm.dataset.option] ? "1" : "0");
		renderCollection();
	};
	
	me.editConfig = function(){
		me.hideMenu();
		breadCrumb.innerHTML = "";
		collectionContainer.innerHTML=Mustache.render(Template.get("config"),Config);
	};

	me.updateConfig = function(){
		var configform = document.getElementById("configform");
		if (configform){
			var data = {};
			var inputs = configform.querySelectorAll(".configinput");
			for (var i = 0; i<inputs.length; i++){
				var input = inputs[i];
				if (input.id) data[input.id] = input.value;
			}
			
			DataProvider.updateConfig(data,function(result){
				if (result.success){
					window.location.reload(true);
				}else{
					me.showDialog("Something went wrong updating your Configuration");
				}
			})
			
		}
	};
	
	me.hideConfig = function(){
		renderCollection();
	};

	me.toggleMenu = function(){
		menu.classList.toggle("active");
		menubutton.className = menu.className;
	};

	me.hideMenu = function(){
		menu.classList.remove("active");
		menubutton.className = menu.className;
	};

	me.hideSearch = function(){
		searchinput.value = "";
		searchResultsContainer.innerHTML = "";
		searchContainer.className = "";
	};

	me.doSearch = function(){
		searchResultsContainer.innerHTML = "";
		var filter = searchInput.value.toLowerCase();
		if (filter && filter.length>1){
			var collection = DataProvider.getCollection();
			var results = [];
			var queue = [collection];

			var collect = function(){
				if (queue.length){
					var target = queue.shift();
					if (target){
						if (!target.searchContent){
							target.searchContent = target.name.toLowerCase();
							if (target.info) target.searchContent += target.info;
							if (target.files && target.files.length){
								target.files.forEach(function(f){target.searchContent += f.name})
							}
							target.searchContent = target.searchContent.toLowerCase();
						}

						if (target.searchContent.toLowerCase().indexOf(filter)>=0){
							results.push({name: target.name, path: target.path});
						}

						if (target.folders){
							target.folders.forEach(function(f){queue.push(f)})
						}

						collect();

					}
				}else{
					if (results.length === 0){
						searchResultsContainer.innerHTML = "<span>No results</span>"
					}else{
						var max = Math.min(results.length,50);
						for (var i = 0; i<max;i++){
							var link = document.createElement("a");
							link.href="#" + results[i].path;
							link.innerHTML=results[i].name;
							searchResultsContainer.appendChild(link);
						}
					}
					searchContainer.className = "active";
				}
			};

			collect();
		}
	};

	me.showLastModified = function(){
		var list = {
			name:"Last Modified",
			folders:DataProvider.getLastModified().slice(0,20),
			noChildren:true,
			path: "/LastModified",
			virtual: true
		};
		DataProvider.setCurrentCollection(list);
	};

	me.showLastAdded = function(){
		var list = {
			name:"Last Added",
			folders:DataProvider.getLastAdded().slice(0,20),
			noChildren:true,
			path: "/LastAdded",
			virtual: true
		};
		DataProvider.setCurrentCollection(list);
	};
	
	me.notFound = function(){
		collectionContainer.innerHTML = Template.get("notfound")
	};
	
	me.editInfo = function(action){
		var infoCol = document.getElementById("infocol");
		var infoContainer = document.getElementById("info");
		var contentContainer = document.getElementById("infocontent");
		var collection = DataProvider.getCurrentCollection();
		var h = infoContainer.clientHeight;
		contentContainer.innerHTML = '';

		if (action){
			if (action === "ok"){
				collection.info = editor.value;
				DataProvider.updateInfo();
			}
			collection.infoHTML = collection.info ? collection.info.replace(/\n/g,"<br>") : false;
			renderCollection();
			App.refresh();
		}else{
			var data = collection.info || "";
			editor = document.createElement("textarea");
			editor.value = data;
			if (h) editor.style.height = Math.max(h,300) + "px";

			contentContainer.appendChild(editor);
			infoContainer.classList.add("editor");
			infoCol.classList.add("editor");
			infoContainer.classList.add("content");
			editor.focus();
			//DataProvider.updateInfo();
		}

	};
	
	me.deleteFile = function(event,filename,path){
		if (event && event.preventDefault){
			event.preventDefault();
			event.stopPropagation();
		}

		if (path && path.indexOf(filename)>=0){
			path = path.split("/");
			path.pop();
			path = path.join("/");
		}

		me.showDialog({
			caption: "Delete File",
			intro: "Are you sure you want to delete " + filename + "?",
			yesno: true,
			onOk: function(){
				DataProvider.deleteFile(filename,path,function(result){
					if (result.success){
						App.refresh();
					}else{
						me.showDialog("Something went wrong");
					}
				})
			}
		})
	};

	me.renameFile = function(event,filename,path){
		if (event && event.preventDefault){
			event.preventDefault();
			event.stopPropagation();
		}
		
		if (path && path.indexOf(filename)>=0){
			path = path.split("/");
			path.pop();
			path = path.join("/");
		}

		console.error(path);

		me.showDialog({
			caption: "Rename File",
			intro: "Enter the new name",
			showInput: true,
			inputValue: filename,
			onOk: function(value){
				if (value){
					DataProvider.renameFile(filename,value,path,function(result){
						if (result.success){
							App.refresh();
						}else{
							me.showDialog("Something went wrong");
						}
					})
				}
			}
		})
	};

	me.upload = function(){
		var input = document.createElement('input');
		input.type = 'file';
		input.onchange = function(e){
			console.log("file uploaded");
			var files = e.target.files;
			if (files.length){
				var file = files[0];
				DataProvider.uploadFile(file,function(result){
					if (result.success){
						App.refresh(function(){});
					}else{
						UI.showDialog(result.error || "Something went wrong uploading your file");
					}
				});
			}
		};
		input.click();
	};

	me.addSubfolder = function(){
		me.showDialog({
			caption: "Add Item",
			intro: "Enter the name of the new item",
			showInput: true,
			onOk:function(value){
				DataProvider.addSubFolder(value,function(result){
					if (result.success){
						App.refresh();
					}else{
						me.showDialog("Something went wrong creating the new item.")

					}
				});
			}
		})
	};
	
	me.showDialog = function(config){
		if (typeof config === "string"){
			config={intro: config}
		}
		config.onCancel = config.onCancel || function(){UI.hideDialog()};
		if (config.showInput || config.yesno) config.showCancel = true;

		var input;

		dialog.innerHTML = config.caption ? '<h3>' + config.caption + '</h3>' : '<br>';
		if (config.intro) dialog.innerHTML += '<p>' + config.intro + '</p>';
		if (config.showInput){
			input = document.createElement("input");
			input.type = "text";
			if (config.inputValue) input.value = config.inputValue;
			dialog.appendChild(input);
		}

		var buttons = document.createElement("div");
		buttons.className = "buttons";
		var ok = document.createElement("div");
		ok.onclick = function(){
			if (config.onOk) config.onOk(input ? input.value : true);
			UI.hideDialog();
		};
		ok.innerHTML = config.yesno ? "Yes" : "OK";
		buttons.appendChild(ok);
		if (config.showCancel){
			var cancel = document.createElement("div");
			cancel.onclick = config.onCancel;
			cancel.innerHTML = config.yesno ? "No" : "Cancel";
			buttons.appendChild(cancel);
		}
		dialog.appendChild(buttons);
		blanket.className = "active";
	};

	me.hideDialog = function(){
		blanket.className = "";
	};
	
	me.quit = function(){
		DataProvider.quit(function(result){
			document.body.innerHTML = Mustache.render(Template.get("quit"));
		});
	};
	
	
	var renderMenu = function(){
		breadCrumb.innerHTML = "";
        var path = DataProvider.getCurrentCollection().path.split("/");
        var currentPath = "";
        path.forEach(function(item){
            var a = document.createElement("a");
            a.innerHTML = item || Config.collectionName;
            if (item) currentPath += "/" + item;
            a.href="#" + currentPath;
            breadCrumb.appendChild(a);
        })
	};
	
	var renderFooter = function(){
		var html = 'KISS-Catalog V ' + (Config.version || dev) + '  - &copy;2019 by <a href="https://www.stef.be/" target="_blank">Steffest</a> - source code on <a href="https://github.com/steffest/KissCatalog" target="_blank">Github</a>';
		footer.innerHTML = html;
	};

	var renderOptions = function(){
		if (Config.hasBackend){
			var buttonLabel = "Rebuild Database";
			var button = document.createElement("div");
			button.className = "button";
			button.innerHTML = buttonLabel;
			button.onclick = function(){
				button.innerHTML = '<i class="spinner">Loading ...</i>';
				App.refresh(function(){
					button.innerHTML = buttonLabel;
					UI.hideMenu();
				});
			};
			
			var button2 = document.createElement("div");
			button2.className = "button";
			button2.innerHTML = "Configuration";
			button2.onclick = me.editConfig;

			optionsContainer.appendChild(button);
			optionsContainer.appendChild(button2);
			
			//if (Config.isRunningPackaged){
				var button3 = document.createElement("div");
				button3.className = "button";
				button3.innerHTML = "Quit";
				button3.onclick = me.quit;
				optionsContainer.appendChild(button3);
			//}
			
			
			
		}
	};
	
	var renderNav = function(){
		
	};
	
	var renderItems = function(){
		
	};

	var setMainImage = function(e){
		e.preventDefault();

		var mainImage = document.getElementById("mainimage");
		mainImage.href = this.href;
		mainImage.style.backgroundImage = "url('"+this.href+"')";
	};
	
	var renderCollection = function(){
		UI.hideSearch();
		var collection = DataProvider.getCurrentCollection();
		var template = Template.get("collection");

		// add mainimage - but not for folders that only contain other items
		if (collection.mainImage && collection.images && (collection.info || collection.folders.length<2)){
			var exists = collection.images.find(function(item){return item.name === collection.mainImage});
			if (!exists) collection.images.unshift({name: collection.mainImage, path: collection.path + "/" + collection.mainImage})
		}

		if (!collection.visibleFiles && collection.files){
			collection.visibleFiles = [];
			collection.files.forEach(function(file){
				if (file.name !== "info.txt"){
					collection.visibleFiles.push(file);
				}
			})
		}

		if (!collection.footerinfo && collection.contentModified){
			var created = "";
			var modified = "last modified on " + new Date(collection.contentModified).toLocaleDateString();
			if (collection.created !== collection.contentModified){
				created = "created on " + new Date(collection.created).toLocaleDateString() + ", ";
			}

			collection.footerinfo = "Item " + created + modified;
		}

		collection.hasInfo = !!(collection.info || (collection.images && collection.images.length));
		collection.hasFiles = !!(collection.visibleFiles && collection.visibleFiles.length);
		collection.hasFolders = !!(collection.folders && collection.folders.length);
		collection.hasInfocol = collection.hasInfo || !collection.hasFiles;
		collection.children = collection.children || [];

		if (collection.info && !collection.infoHTML){
			collection.infoHTML = collection.info.replace(/\n/g,"<br>");
		}
		
		collection.folders.forEach(function(f){
			f.itemCount = 0 + (f.folders ? f.folders.length : 0) + (f.files ? f.files.length : 0);
		});

		// Add all items from children if needed
		if (Config.showChildren && !collection.noChildren && collection.children.length === 0){
			function addChildren(parent){
				if (parent){
					parent.folders.forEach(function(child){
						collection.children.push(child);
						addChildren(child);
					})
				}
			}
			
			collection.folders.forEach(function(f){
				if (f.folders){
					addChildren(f);
				}
			});
		}
		collection.showChildren = Config.showChildren && collection.children.length;
		collection.showGrid = !Config.showAsList;
		
		
		collectionContainer.className = Config.showAsList ? "list" : "grid";

		collectionContainer.innerHTML = Mustache.render(template,collection,Config);
		var thumbs = document.getElementById("thumbs");
		if (thumbs){
			var images = thumbs.querySelectorAll("a");
			for (var i=0, max=images.length;i<max;i++){images[i].onclick = setMainImage;}
		}



		renderMenu();
	};
	
	EventBus.on(EVENT.COLLECTION_CHANGE,renderCollection);
	
	
	return me;
}();