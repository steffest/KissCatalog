/* Util functions */

function getUrlParameter(param){
    if (window.location.getParameter){
        return window.location.getParameter(param);
    } else if (location.search) {
        var parts = location.search.substring(1).split('&');
        for (var i = 0; i < parts.length; i++) {
            var nv = parts[i].split('=');
            if (!nv[0]) continue;
            if (nv[0] == param) {
                return nv[1] || true;
            }
        }
    } else {
        //return $.url.param(param);
        return "";
    }
}

// Cookies

function createCookie(name,value,days) {
    if (days) {
        var date = new Date();
        date.setTime(date.getTime()+(days*24*60*60*1000));
        var expires = "; expires="+date.toGMTString();
    }
    else var expires = "";
    document.cookie = name+"="+value+expires+"; path=/";
}

function readCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for(var i=0;i < ca.length;i++) {
        var c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1,c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
    }
    return null;
}

function eraseCookie(name) {
    createCookie(name,"",-1);
}


// Formatting

function decimalToDegrees(decimal,LatLong){
    var limitSecondsFraction = true;

    var sign = 1;
    if (isNaN(decimal)) decimal=0;
    if (decimal<0) sign = -1;

    var kwadrantChar = "";
    if (LatLong){
        // don't use negative numbers but NSWE
        if (LatLong == "lat"){
            kwadrantChar = " N";
            if (sign<0) kwadrantChar = " S";
        }
        if (LatLong == "lon"){
            kwadrantChar = " E";
            if (sign<0) kwadrantChar = " W";
        }
        sign = 1;

    }

    var decimalAbs = Math.abs(Math.round(decimal * 1000000.));
    if(decimalAbs > (180 * 1000000)) {
        // error: Degrees Longitude must be in the range of -180 to 180.
        decimalAbs=0;
    }

    var degree = Math.floor(decimalAbs/1000000) * sign;
    var minutes = Math.floor(((decimalAbs/1000000) - Math.floor(decimalAbs/1000000)) * 60);
    var seconds = (Math.floor(((((decimalAbs/1000000) - Math.floor(decimalAbs/1000000)) * 60) - Math.floor(((decimalAbs/1000000) - Math.floor(decimalAbs/1000000)) * 60)) * 100000) *60/100000 );
    if (limitSecondsFraction) seconds = Math.round(seconds*10)/10;

    var degreeString = degree + '&deg; ' + minutes + '\' ' + seconds + '&quot;' + kwadrantChar;

    degreeString = degreeString.split(".").join(",");

    return degreeString;

}

// GroupBy
Array.prototype.groupBy = function(prop) {
    return this.reduce(function(groups, item) {
        var val = item[prop];
        groups[val] = groups[val] || [];
        groups[val].push(item);
        return groups
    }, {})
};

// DOM helpers

function div(className,innerHTML){
    var d = document.createElement("div");
    if (className) d.className = className;
    if (innerHTML) d.innerHTML = innerHTML;
    return d;
}