var Grid = function(){
    var me = {};
    var container;

    var isHeaderDrag;
    var dragObject = {};
    var cols = [];
    var headers = [];

    me.generate = function(){
        var box = document.getElementById("gridbox");
        container = document.getElementById("grid");

        box.className = "active";
        container.innerHTML = "";

        var collection = DataProvider.getCollection();

        container.onmousemove = function(e){
            if (isHeaderDrag){
                e.preventDefault();
                var delta = e.screenX - dragObject.startX;
                var width = cols[dragObject.col].width + delta;


                cols[dragObject.col].newWidth = width;
                cols[dragObject.col].cells.forEach(function(cell){
                    cell.style.width = width + "px";
                });
            }
        };

        container.onmouseup = function(e){
            if (isHeaderDrag){
                if (cols[dragObject.col].newWidth){
                    cols[dragObject.col].width = cols[dragObject.col].newWidth;
                }
            }
            isHeaderDrag = false;
        };

        generateHeaders();
        render(collection,1);


    };

    me.hide = function(){
        var box = document.getElementById("gridbox");
        box.className = "";
    };

    function render(item,depth){

        if (item.folders){
            item.folders.forEach(function(folder){
                var row = generateRow(folder,depth);
                container.appendChild(row);

                render(folder,depth+1);
            });
        }
    }

    function generateHeaders(){
        var row = document.createElement("div");
        row.className = "header row";

        headers = [{name: "Name",type : "main"}];
        if (Config.properties && Config.properties.length){
            Config.properties.forEach(function(property,index){
                headers.push({name: property.name, type: "property", propertyIndex: index});
            });

        }
        headers.push(
            {name: "Info", type: "info"},
            {name: "Images", type: "images"},
            {name: "Files", type: "files"},
            {name: "Path" , type : "path"});

        headers.forEach(function(header,index){
            cols[index] = {
                width: 150,
                cells: []
            };
            var cell = generateCell({value: header.name,col:index});
            if (index === 0){
                cols[index].width = 180;
                cell.className += " name";
            }
            resizer(cell,index);
            row.appendChild(cell);
        });

        container.appendChild(row);

        container.onscroll = function(e){
            row.style.marginLeft = (0-container.scrollLeft) + "px";
        };

        var margin = document.createElement("div");
        margin.className = "row";
        margin.appendChild(generateCell({value: "&nbsp;"}));
        container.appendChild(margin);
    }

    function generateRow(data,depth){
        var row = document.createElement("div");
        row.className = "row";

        var col = 0;
        row.appendChild(generateCell({value: data.displayName, col: col,indent: depth}));

        DataProvider.generateExtendedInfo(data);

        var properties = {info: data.info};
        if (Config.properties && Config.properties.length){
            if (!data.properties){
                data.properties = [];
                properties = DataProvider.parseProperties(data.info || "");
                properties.list.forEach(function(property){
                    data.properties.push({name: property.name, value: property.value});
                });
                data.displayInfo = properties.info;
            }

            Config.properties.forEach(function(property){
                var match = data.properties.find(function(item) {return item.name === property.name}) || {value:'&nbsp;'};
                row.appendChild(generateCell({value: match.value, col: ++col}));
            });
        }

        row.appendChild(generateCell({value: properties.info || "&nbsp;", col: ++col}));
        row.appendChild(generateCell({value: data.images.length ? data.images.length + " images" : "&nbsp;", col: ++col}));
        row.appendChild(generateCell({value: (data.visibleFiles && data.visibleFiles.length) ?  data.visibleFiles.length + ": " + data.visibleFiles.map(function(item){return item.name}).join (", ") : "&nbsp;", col: ++col}));
        row.appendChild(generateCell({value: data.path, col: ++col}));

        row.path = data.path;

        return row;

    }

    function generateCell(data){
        var cell = document.createElement("div");
        cell.className = "cell";
        if (data.indent) cell.className += " name d" + data.indent;
        cell.innerHTML = data.value;

        if (typeof data.col === "number"){
            cols[data.col].cells.push(cell);

            cell.onclick = function(){
               handCellClick(this,data.col);
            };
        }
        return cell;
    }

    function resizer(cell,col){
        var handle = document.createElement("b");
        handle.onmousedown = function(e){
            e.preventDefault();
            dragObject.startX = e.screenX;
            dragObject.col = col;
            isHeaderDrag = true;
        };
        cell.appendChild(handle);
    }

    function  handCellClick(cell,col){
        var path = cell.parentElement.path;
        var collection = DataProvider.getCollectionByPath(path);
        var header = headers[col];

        switch (header.type) {
            case "main":
                window.location.href = "#" + collection.path;
                UI.hideGrid();
                break;
            case "info":
                var config = {
                    caption: collection.displayName + ": info",
                    showTextarea: true,
                    textareaValue:  collection.displayInfo || "",
                    onOk: function(value){
                        collection.displayInfo = value;
                        updateCollection(collection);
                    }
                };
                UI.showDialog(config);


                break;
            case "property":
                var property = Config.properties[header.propertyIndex];
                var myProperty = collection.properties.find(function(item) {return item.name === property.name});

                var config = {
                    caption: collection.displayName + ": " + property.name,
                    showInput: true,
                    inputValue:  myProperty ? myProperty.value : "",
                    onOk: function(value){
                        collection.properties = collection.properties || [];
                        if (myProperty){
                            myProperty.value = value;
                        }else{
                            collection.properties.push({name: property.name, value: value})
                        }
                        updateCollection(collection);
                    }
                };
                UI.showDialog(config);
                break;
        }
    }

    function updateCollection(collection){
        DataProvider.rebuildInfo(collection);
        DataProvider.setCurrentCollection(collection,true);
        DataProvider.updateInfo();
        DataProvider.clearCollectionCache(collection);
        App.refresh();
    }


    return me;
}();