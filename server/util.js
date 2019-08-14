var Util = function(){
	var me = {};

	me.parseJson = function(s){
		var result;
		try{
			result = JSON.parse(s);
		}catch (e) {
			result={}
		}
		return result;
	};
	
	me.cleanPath = function(s){
		if (typeof s === "string"){
			s = s.split("\\").join("/");
			s = s.split("//").join("/");
			s = s.split("..").join("");
		}
		return s;
	};

	me.cleanFilename = function(s){
		if (typeof s === "string"){
			s = s.split("\\").join("/");
			s = s.split("/").join("");
			s = s.split("..").join("");
			s = s.split("?").join("");
			s = s.split("&").join("");
			s = s.split("%").join("");
			s = s.split("#").join("");
			
			s = s.split(" ").join("-");
		}
		return s;
	};

	me.openUI = function(url){
		var commands = {darwin: "open", win32: "explorer.exe", linux: "xdg-open"};
		var command = commands[process.platform] || "open";

		var spawn = require('child_process').spawn;
		var p = spawn(command, [url]);
	};

	me.isFullPath = function(s){
		if (process.platform.substr(0,3) === "win"){
			return s.indexOf(":/")>0;
		}else{
			return s.substr(0,1) === "/";
		}
	};
	
	me.addSlash = function(s){
		if (s && s.substr(s.length-1) !== "/") s+="/";
		return s;
	};
	
	return me;
}();

module.exports = Util;