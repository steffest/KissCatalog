/*
	Server component for KISS-Catalog
	by Steffest - 2019
	
	This is just a quick script for single-user use - not suited for a multi-user production environment
	I kept things (too) simple on purpose to keep a zero-dependency setup.
	
	But it does serve a REST API that handles
		- authentication,
		- POST 
		- binary file uploads
		
	the complete package can be packed into a singly binary executable with PKG	
	
 */


var httpServer = require("./server/httpserver.js");
var scanner = require("./server/scanner.js");
var util = require("./server/util.js");
var fs = require("fs");
var path = require("path");


// set different config paths.
// we can either run directly on node, or packaged.

var config = {
	version: require("./package.json").version,
	port: process.env.PORT || 4303
};

var p = (__dirname).indexOf("snapshot");
config.isRunningPackaged =  p>=0 && p<5;

// note: when running packaged, __dirname points to the virtual filesystem inside the package
config.clientPath =  __dirname + "/client/";

config.appDir = __dirname + "/";
if (config.isRunningPackaged){
	// get the path to the real filesystem when running packaged
	config.appDir = path.dirname(process.execPath) + "/"
}

//setup default folders
if (!fs.existsSync(config.appDir + "client")) fs.mkdirSync(config.appDir + "client");
if (!fs.existsSync(config.appDir + "client/_data")) fs.mkdirSync(config.appDir + "client/_data");
if (!fs.existsSync(config.appDir + "client/collection")) fs.mkdirSync(config.appDir + "client/collection");


config.dataPath = config.appDir + "client/_data/";

// for dev version, keep data files out of the repository
if (fs.existsSync(config.appDir + "data")) config.dataPath = config.appDir + "data/";


console.log("Using config from  " + config.dataPath);

// don't use require, we also want this to work with packaged apps running on the local filesystem
try{
	var userConfig = fs.readFileSync(config.dataPath + "config.json");
	userConfig = JSON.parse(userConfig.toString());
}catch (e) {
	console.log("Userconfig not found");
	userConfig = {};
}

for (let key in userConfig){
	config[key] = userConfig[key];
}
	
// dev : use different path for Dropbox synced folder
	if (process.platform === "darwin" && config.collectionPathOSX) config.collectionPath = config.collectionPathOSX;


config.fullcollectionPath = config.collectionPath;
if (config.fullcollectionPath && !util.isFullPath(config.fullcollectionPath)) config.fullcollectionPath =  config.appDir + config.fullcollectionPath;
config.fullcollectionPath = util.addSlash(config.fullcollectionPath);

if (config.fullcollectionPath) {
	console.log("Using collection files from  " + config.fullcollectionPath);
}else{
	console.log("Path to collection files not yet specified");
}
	
httpServer.init(config);

if (!config.isRunningPackaged){
	console.log("Node version " + process.version);
	if (process.env.IISNODE_VERSION) console.log("IISnode version " + process.env.IISNODE_VERSION);
	console.log("Running on port " + config.port + " on " + process.platform);
	console.log("I'm at http://localhost:" + config.port);
	console.log("--------------------");
}

scanner.init(config,function(){
	util.openUI("http://localhost:" + config.port);
});




