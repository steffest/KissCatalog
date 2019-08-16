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
	var popupmenu;

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
		popupmenu = document.getElementById("popupmenu");

		FetchService.json("_data/config.json",function(result){
			if (result){
				for (var key in result){
					Config[key] = result[key];
				}
			}

			Config.hasBackend = !!Config.hasBackend;
			if (Config.staticCollectionUrl) Config.collectionUrl = Config.staticCollectionUrl;
			if (Config.staticCollectionUrlPublic && !Config.hasBackend) Config.collectionUrl = Config.staticCollectionUrlPublic;
			Config.properties = Config.properties || [];
			
			//console.error(Config.collectionUrl);
			renderFooter();
			renderOptions();

			Config.isLoggedIn = Config.hasBackend && Config.isAuthenticated;
			if (!Config.isLoggedIn){
				document.body.classList.add("static");
			}

			if (next) next();
		});

		blanket.onclick = function(){
			if (blanket.classList.contains("popup")) me.hideDialog();
		};

	};

	me.toggleOption = function(elm){
		elm.classList.toggle("active");
		Config[elm.dataset.option] = elm.classList.contains("active");
		localStorage.setItem("kiss-" + [elm.dataset.option],Config[elm.dataset.option] ? "1" : "0");
		renderCollection();
	};

	me.editConfig = function(){

		buildOptions = function(list) {
			list.forEach(function(item){
				item["is" + item.type] = true;
				item.privateString = item.private?"Yes":"No";
			});
		};
		
		
		me.hideMenu();
		breadCrumb.innerHTML = "";
		if (Config.hasBackend){
			buildOptions(Config.properties);
			collectionContainer.innerHTML=Mustache.render(Template.get("config"),Config);
		}else{
			document.body.innerHTML=Mustache.render(Template.get("noconfig"),Config);
		}

	};

	me.login = function(){
		me.hideMenu();
		breadCrumb.innerHTML = "";
		if (Config.hasBackend){
			collectionContainer.innerHTML=Mustache.render(Template.get("login"),Config);
		}else{
			document.body.innerHTML=Mustache.render(Template.get("noconfig"),Config);
		}
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

			if (data.password && data.password !== "dummy"){
				data.password = md5(data.password)
			}
			
			data.properties = [];
			var properties = configform.querySelectorAll(".configproperty");
			for (i = 0; i<properties.length; i++){
				var row = properties[i];
				var name = row.querySelector("input").value;
				var select = row.querySelector("select");
				var options = row.querySelector(".propertyoptions");
				
				var type =  select.options[select.selectedIndex].text.toLowerCase();
				var _private = false;
				if (options){
					_private = options.innerText.indexOf("Private: Yes")>=0;
				}
				
				if (name){
					data.properties.push({name: name, type: type, private: _private});
				}
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

	me.doLogin = function(){
		var loginform = document.getElementById("loginform");
		if (loginform){
			var data = {};
			var inputs = loginform.querySelectorAll(".logininput");
			for (var i = 0; i<inputs.length; i++){
				var input = inputs[i];
				if (input.id) data[input.id] = input.value;
			}

			DataProvider.login(data,function(result){
				if (result.success){
					window.location.reload(true);
				}else{
					me.showDialog("Sorry, invalid login");
				}
			})

		}
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

	me.showGrid = function(){
		Grid.generate();
	};

	me.hideGrid = function(){
		Grid.hide();
	};

	me.notFound = function(){
		collectionContainer.innerHTML = Template.get("notfound")
	};

	me.editInfo = function(action){
		var infoCol = document.getElementById("infocol");
		var infoContainer = document.getElementById("info");
		var propertiesContainer = document.getElementById("properties");
		var contentContainer = document.getElementById("infocontent");
		var collection = DataProvider.getCurrentCollection();
		var h = infoContainer.clientHeight;
		contentContainer.innerHTML = '';

		if (action){
			if (action === "ok"){
				collection.info = editor.value;
				
				Config.properties.forEach(function(property,index){
					var value = "";
					var editor = document.getElementById("propertyeditor" + index);
					if (editor){
						var input = editor.querySelector("input");
						if (input) value = input.value;
					}
					if (value){
						collection.info = property.name + ": " + value + '\n' + collection.info;
					}
				});
				
				DataProvider.updateInfo();
			}
			if (propertiesContainer) propertiesContainer.classList.remove("haseditor");
			
			// clear generated collection cache;
			DataProvider.clearCollectionCache(collection);
			renderCollection();
			App.refresh();
		}else{
			var data = collection.info || "";
			
			var properties = DataProvider.parseProperties(data,true);
			editor = document.createElement("textarea");
			editor.value = properties.info;
			if (h) editor.style.height = Math.max(h,300) + "px";

			contentContainer.appendChild(editor);
			infoContainer.classList.add("editor");
			infoCol.classList.add("editor");
			infoContainer.classList.add("content");
			editor.focus();

			if (propertiesContainer){
				propertiesContainer.innerHTML = "";
				propertiesContainer.classList.add("haseditor");

				var list = document.createElement("table");
				list.className = "editor";
				properties.list.forEach(function(property,index){
					var row = document.createElement("tr");
					var label = document.createElement("td");
					label.innerHTML = property.name;
					label.className = "label";
					label.width = "1%";
					var editor = document.createElement("td");
					editor.id = "propertyeditor" + index;
					editor.className = "editor";
					var input = document.createElement("input");
					input.type = "text";
					input.value = property.value;
					editor.appendChild(input);
					row.appendChild(label);
					row.appendChild(editor);
					list.appendChild(row);
				});
				propertiesContainer.appendChild(list);
			}

			
			//DataProvider.updateInfo();
		}

	};
	

	me.addProperty = function(){
		var container = document.getElementById("config_properties");
		var template = document.getElementById("config_properties_new");
		if (container && template){
			var row = document.createElement("tr");
			row.className = "configproperty";
			row.innerHTML = template.innerHTML;
			container.appendChild(row);
		}
	};
	
	me.toggleProperty = function(elm){
		var value = elm.innerHTML;
		if (value.indexOf("No")>0){
			elm.innerHTML = value.replace('No','Yes');
		}else{
			elm.innerHTML = value.replace('Yes','No');
		}
	};

	me.itemPopupMenu = function(event,type,filename,path){

		if (event && event.preventDefault){
			event.preventDefault();
			event.stopPropagation();
		}
		
		var menu = document.createElement("div");
		menu.innerHTML = "";
		menu.className = "submenu";

		var pos = getOffset(event.target,true);
		var config = {
			x: parseInt(pos.left),
			y: parseInt(pos.top) + 20,
			items:[
				{label: "Rename", onclick: function(){UI.renameFile(event,filename,path)}},
				{label: filename.indexOf("_private")>0 ? "Make public" : "Make private", onclick: function(){UI.toggleFlag(event,"private",filename,path)}},
				{label: "Delete", onclick: function(){UI.deleteFile(event,filename,path)}}
			]
		};
		
		
		if (type === "image"){
			config.items.splice(1,0,{label: "Edit Image", onclick: function(){UI.editImage(event,filename,path)}});
		}
		me.showPopup(config);

		var button = event.target;
		console.log(event);
		console.log(event.target);
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

	me.editImage = function(event,filename,path){
		if (path && path.indexOf(filename)>=0){
			path = path.split("/");
			path.pop();
			path = path.join("/");
		}

		path = path || DataProvider.getCurrentCollection().path;
		var fullUrl = Config.collectionUrl + path + "/" + filename;

		DataProvider.prepareFile(filename,path,function(result){
			if (result.success){
				var editUrl = "_plugins/imageeditor/index.html";
				editUrl += "?f=" + encodeURIComponent(fullUrl);
				editUrl += "?callback=" + encodeURIComponent("/uploadbase64/" + result.id);
				window.location.href = editUrl;
			}
		});
		
	};

	me.toggleFlag = function(event,flag,filename,path){
		
		if (path && path.indexOf(filename)>=0){
			path = path.split("/");
			path.pop();
			path = path.join("/");
		}
		
		var newName = filename;
		if (newName.indexOf("_" + flag)>0){
			newName = newName.replace("_" + flag,"");
		}else{
			var parts = newName.split(".");
			if (parts.length>1){
				var ext = parts.pop();
				newName = parts.join(".") + "_" + flag + "." + ext;
			}else{
				newName += "_" + flag;
			}
		}
		
		DataProvider.renameFile(filename,newName,path,function(result){
			if (result.success){
				App.refresh();
			}else{
				me.showDialog("Something went wrong");
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
		if (config.showInput || config.showTextarea || config.yesno) config.showCancel = true;

		var input;

		dialog.innerHTML = config.caption ? '<h3>' + config.caption + '</h3>' : '<br>';
		if (config.intro) dialog.innerHTML += '<p>' + config.intro + '</p>';
		if (config.showInput){
			input = document.createElement("input");
			input.type = "text";
			if (config.inputValue) input.value = config.inputValue;
			dialog.appendChild(input);
		}
		if (config.showTextarea){
			input = document.createElement("textarea");
			if (config.textareaValue) input.value = config.textareaValue;
			dialog.appendChild(input);
			dialog.classList.add("wide");
		}else{
			dialog.classList.remove("wide");
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
		blanket.className = "active dialog";
	};

	me.hideDialog = function(){
		blanket.className = "";
	};

	me.showPopup = function(config){
		popupmenu.style.left = config.x + "px";
		popupmenu.style.top = config.y + "px";

		popupmenu.innerHTML = "";
		if (config.items){
			config.items.forEach(function(item){
				var button = createElm("div","button",item.label);
				button.onclick = item.onclick;
				popupmenu.appendChild(button);
			});
		}

		blanket.className = "active popup";


	};

	me.quit = function(){
		DataProvider.quit(function(result){
			document.body.innerHTML = Mustache.render(Template.get("quit"));
		});
	};

	
	var getCondensedName = function(s){
		if (s){
			if (s.indexOf("_private")>0) s=s.replace("_private","");
		}
		return s;
	};

	var getExpandedName = function(s){

	};

	var renderMenu = function(){
		breadCrumb.innerHTML = "";
        var path = DataProvider.getCurrentCollection().path.split("/");
        var currentPath = "";
        path.forEach(function(item){
            var a = document.createElement("a");
            a.innerHTML = getCondensedName(item) || Config.collectionName;
            if (item) currentPath += "/" + item;
            a.href="#" + currentPath;
            breadCrumb.appendChild(a);
        })
	};

	var renderFooter = function(){
		var html = 'KISS-Catalog V ' + (Config.version || "dev") + '  - &copy;2019 by <a href="https://www.stef.be/" target="_blank">Steffest</a> - source code on <a href="https://github.com/steffest/KissCatalog" target="_blank">Github</a>';
		footer.innerHTML = html;
	};

	var renderOptions = function(){
		if (Config.hasBackend){

			if (Config.isAuthenticated){
				var buttonLabel = "Rebuild Database";
				var button = createElm("div","button",buttonLabel);
				button.onclick = function(){
					button.innerHTML = '<i class="spinner">Loading ...</i>';
					App.refresh(function(){
						button.innerHTML = buttonLabel;
						UI.hideMenu();
					});
				};

				var button2 = createElm("div","button","Configuration");
				button2.onclick = me.editConfig;

				optionsContainer.appendChild(button);
				optionsContainer.appendChild(button2);

				//if (Config.isRunningPackaged){
				var button3 = createElm("div","button","Quit");
				button3.onclick = me.quit;
				optionsContainer.appendChild(button3);
				//}
			}else{
				button = createElm("div","button","Login");
				button.onclick = me.login;

				optionsContainer.appendChild(button);
			}
		}
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

		DataProvider.generateExtendedInfo(collection);

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
		
		var properties = {info: collection.info};
		if (!collection.properties){
			collection.properties = [];
			properties = DataProvider.parseProperties(collection.info || "");
			properties.list.forEach(function(property){
				var passed = true;
				if (property.private && !Config.isLoggedIn) passed = false;
				if (passed) collection.properties.push({name: property.name, value: property.value});
			});
			collection.displayInfo = properties.info;
		}
		
		if (properties.info && !collection.infoHTML){
			collection.infoHTML = properties.info.replace(/\n/g,"<br>");
		}

		collection.folders.forEach(function(f){
			f.itemCount = 0 + (f.folders ? f.folders.length : 0) + (f.files ? f.files.length : 0);
			f.private = !!f.private;
		});

		if (collection.images){
			collection.images.forEach(function(f){
				f.private = !!f.private;
			});
		}


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

	function getOffset(elm,fixed){
		var rect = elm.getBoundingClientRect(),
			scrollLeft = window.pageXOffset || document.documentElement.scrollLeft,
			scrollTop = window.pageYOffset || document.documentElement.scrollTop;
		
		if (fixed){
			scrollLeft = 0;
			scrollTop = 0;
		}
		
		return { top: rect.top + scrollTop, left: rect.left + scrollLeft };
	}

	function createElm(type,className,innerHTML,id){
		var elm = document.createElement(type);
		if (className) elm.className = className;
		if (id) elm.id = className;
		if (innerHTML) elm.innerHTML = innerHTML;
		return elm;
	}

	EventBus.on(EVENT.COLLECTION_CHANGE,renderCollection);


	return me;
}();
