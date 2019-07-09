var App = function(){
	var me = {};
	
	me.init = function(){
		var loaded = {};

		var done = function(){
			if (loaded.data && loaded.templates && loaded.config) {
				if (Config.hasCollection){
					window.addEventListener("hashchange", handleNav, false);
					var path = location.hash.substr(1);
					if (path){
						handleNav();
					}else{
						DataProvider.setCurrentCollection(loaded.data);
					}
				}else{
					UI.editConfig();
				}
			}
		};

		DataProvider.load(function(data){loaded.data = data; done()});
		Template.load("_templates/main.html",function(){loaded.templates = true; done()});
		UI.init(function(){loaded.config = true; done()});

		//restore config from Local Storage
		Config.showChildren = localStorage.getItem("kiss-showChildren") === "1";
		Config.showAsList = localStorage.getItem("kiss-showAsList") === "1";

		if (Config.showChildren) document.getElementById("option_ch").classList.add("active");
		if (Config.showAsList) document.getElementById("option_li").classList.add("active");
		
		
	};
	
	me.refresh = function(next){
		DataProvider.refresh(function(){
			handleNav();
			if (next) next();
		});	
	};

	var handleNav = function(){
		UI.hideMenu();
        var path = decodeURIComponent(location.hash.substr(1));
        switch (path.toLowerCase()) {
			case "/lastmodified":
				UI.showLastModified();
				break;
			case "/lastadded":
				UI.showLastAdded();
				break;
			default:
				var collection = DataProvider.getCollectionByPath(path);
				if (collection){
					DataProvider.setCurrentCollection(collection);
				}else{
					DataProvider.setCurrentCollection({name:"notfound",path: "",folders:[]});
					UI.notFound();
				}
		}
    };
	
	return me;
}();