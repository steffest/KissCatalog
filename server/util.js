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
		}
		return s;
	};
	
	return me;
}();

module.exports = Util;