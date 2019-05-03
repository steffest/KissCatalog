var Template = function(){
    var me = {};
    var templates={};

    me.load = function(url,next){

        FetchService.get(url, function(s) {

            // parse templates
            var p = s.indexOf("<!--");
            while (p>=0){
                var template = s.substr(p + 4);
                p = template.indexOf("-->");
                var templateName = template.substr(0,p);
                template = template.substr(p+3);
                var end = "<!--/" + templateName + "-->";
                p = template.indexOf(end);
                s =  template.substr(p + end.length);
                template = template.substr(0,p);
                templates[templateName] = template;
                p = s.indexOf("<!--");
            }

            next();
        });


    };

    me.get = function(name){
		return templates[name] || "The template " + name + " does not exist";
    };

    me.render = function(name,data){
        return Mustache.render(me.get(name),data);
    };



    return me;

}();