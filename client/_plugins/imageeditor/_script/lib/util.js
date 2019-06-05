function el(id){
    return document.getElementById(id);
}


function getUrlParameter(param){
    var result = window.location.search.split(param + '=').splice(1).join('').split('&')[0];
    result = result.split("+").join(" ");
    return decodeURIComponent(result);
}


function hideElm(elm){
    if (typeof elm === "string") elm = el(elm);
    if (elm) elm.style.display = "none";
}

function showElm(elm,style){
	if (typeof elm === "string") elm = el(elm);
	if (elm) elm.style.display = style || "initial";
}

function getPosition(elm){
	var rect = elm.getBoundingClientRect(),
		scrollLeft = window.pageXOffset || document.documentElement.scrollLeft,
		scrollTop = window.pageYOffset || document.documentElement.scrollTop;
	return { top: rect.top + scrollTop, left: rect.left + scrollLeft };
}




