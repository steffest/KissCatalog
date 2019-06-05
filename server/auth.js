var Auth = function(){
    var me = {};
    var sessions = {};
    var md5 = require("../client/_script/lib/md5.js");

    var sessionCookieName = "KCsid";
    var passHash;

    me.init = function(config){
        passHash = config.passHash || "";
    };

    me.isAuthenticated = function(req,res){
        if (isLocalHost(req)) return true;
        var session = false;
        var sessionId = getCookie(req,sessionCookieName);
        if (sessionId){
            session = sessions[sessionId];
            if (session && session.expires && session.expires<new Date().getTime()){
                delete sessions[sessionId];
                session = false;
            }
        }
        return !!session;
    };

    me.login = function(data,user,req,res,next){
        var passed = false;

        var _5_minutes = 1000 * 60 * 5;
        var _10_days = 1000 * 60 * 60 * 24 * 10;

        console.log("logging in ...");

        if (user && data){
            var challenge = parseInt(data.challenge);
            if (isNaN(challenge)) challenge=0;
            if ((new Date().getTime() - challenge) > _5_minutes){
                // challenge expired
            }else{
                if (user.user && data.response && (md5(data.challenge + "_" + user.user) === data.response)){
                    passed = true;

                    var id = getId();
                    sessions[id] = {
                        expires: new Date().getTime() + (1000 * 60 * 60 * 24 * 10)
                    };
                    setCookie(res,sessionCookieName,id);
                }
            }
        }

        console.log(passed ? "loggin succesfull" : "invalid login");
        if (next) next(passed );
    };

    function getCookie(req,cookieName){
        var result = "";
       if (req.headers.cookie){
           var cookies = req.headers.cookie.split(";");
           cookies.forEach(function(cookie){
               cookie = cookie.trim();
               var values = cookie.split("=");
               if (values[0] === cookieName){
                   result = values[1] || "";
               }
           })
       }
       return result;
    }

    function setCookie(res,cookieName,value){
        var d = new Date();
        d.setDate(d.getDate() + 10); // valid for 10 days
        var cookie = cookieName + '=' + value+';expires='+d.toUTCString()+'; path=/;';
        res.setHeader('Set-Cookie',[cookie]);
    }

    function isLocalHost(req){
        return (req.headers.host && req.headers.host.toLowerCase().indexOf("localhost:") === 0);
    }

    function getId(){
        return md5("" + new Date().getTime() + Math.random());
    }

    return me;

}();

module.exports = Auth;