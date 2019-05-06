var Logger = function(){
	var me = {};

	var info=[];
	var error=[];
	var maxHistory = 100;

	me.info = function(message){
		log(info,message);
		console.log(message);

	};

	me.error = function(message){
		log(error,message);
		console.error(message);
	};

	me.getInfo = function(){
		return info;
	};

	me.getError = function(){
		return error;
	};

	function log(target,message){
		target.push(new Date().toISOString() + ": " + message);
		if (target.length>maxHistory) target.unshift();
	}


	return me;
}();

module.exports = Logger;