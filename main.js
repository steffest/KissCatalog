/*
	Server component for KISS-Catalog
	by Steffest - 2019
	
	This is just a quick script for single-user use - not suited for a multi-user production environment
	I kept things (too) simple on purpose to keep a zero-dependency setup.
	
	But it does serve a REST API that handles
		- authentication
		- POST 
		- binary file uploads
		
	the complete package can be packed into a singly binary executable with PKG	
	
 */


var httpServer = require("./server/httpserver.js");
var scanner = require("./server/scanner.js");
var fs = require("fs");
var config = {
	version: require("./package.json").version
};

config.port = process.env.PORT || 4303;
var p = (__dirname).indexOf("snapshot");
config.isRunningPackaged =  p>=0 && p<5;
config.clientPath =  __dirname + "/client/";

//setup default folders
if (!fs.existsSync("./client")) fs.mkdirSync("./client");
if (!fs.existsSync("./client/_data")) fs.mkdirSync("./client/_data");
if (!fs.existsSync("./client/collection")) fs.mkdirSync("./client/collection");

// don't use require, we also want this to work with packaged apps running on the local filesystem
try{
	var userConfig = fs.readFileSync("./config.json");
	userConfig = JSON.parse(userConfig.toString());
}catch (e) {
	console.log("Userconfig not found");
	userConfig = {};
}

for (let key in userConfig){
	config[key] = userConfig[key];
}


if (process.platform === "darwin" && config.collectionPathOSX) config.collectionPath = config.collectionPathOSX;

httpServer.init(config);

if (!config.isRunningPackaged){
	console.log("Node version " + process.version);
	if (process.env.IISNODE_VERSION) console.log("IISnode version " + process.env.IISNODE_VERSION);
	console.log("Running on port " + config.port + " on " + process.platform);
	console.log("I'm at http://localhost:" + config.port);
	console.log("--------------------");
}

scanner.init(config,function(){
	//openUI();
});


function openUI(){
	var commands = {darwin: "open", win32: "explorer.exe", linux: "xdg-open"};
	var command = commands[process.platform] || "open";

	var spawn = require('child_process').spawn;
	var p = spawn(command, ["http://localhost:" + config.port]);
}

