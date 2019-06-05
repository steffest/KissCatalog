var Touch = (function () {


    var maxTapDelay = 180; // threshold in milliseconds when a tap counts as a tap (and not a "hold")
    var minSwipeDistance = 40; // threshold in pixels when a swipe counts as a swipe (and not a tap);
    var minDragDistance = 20; // threshold in pixels when a drag counts as a drag (and not a tap);

    var touchEvents = {};
    var touchData = {};
    var touchClasses = {};
    var currentTouchData;

    var SELECTORTYPE = {
        ID: 1,
        CLASS: 2
    };

    var init = function(){
        touchEvents.updateDragSpeedInterval = false;

        document.addEventListener('touchstart',handleTouchStart);
        document.addEventListener('touchmove',handleTouchMove);
        document.addEventListener('touchend',handleTouchEnd);

        document.addEventListener('mousedown',function(ev){
            if (!touchEvents.handledTouch){
                touchEvents.isMouseDown = true;
                handleTouchStart(event,"mousedown");
            }
        });

        document.addEventListener('mousemove',function(ev){
            if (touchEvents.isMouseDown){
                handleTouchMove(event,"mousemove");
            }
        });

        document.addEventListener('mouseup',function(ev){
            if (touchEvents.isMouseDown){
                touchEvents.isMouseDown = false;
                handleTouchEnd(event,"mouseup");
            }
        });
    };

    function getSelectorType(handle){
        var result = SELECTORTYPE.ID;
        if (handle.substr(0,1) == ".") result = SELECTORTYPE.CLASS;
        return result;
    }

    function addTouchEvent(handle,event){
        if (handle.substr(0,1) == "#") handle = handle.substr(1);
        var selectorType = getSelectorType(handle);
        switch (selectorType){
            case SELECTORTYPE.ID:
                touchData[handle] = event;
                break;
            case SELECTORTYPE.CLASS:
                touchClasses[handle.substr(1)] = event;
                break;
        }
    }

    function handleTouchStart(event,source){

        var elm = event.srcElement;
        var originalElm = elm;

        // bubble up until first element with touchEvents
        currentTouchData = undefined;
        var checkParent = true;
        do{
            if (elm.id) currentTouchData = touchData[elm.id];
            if (!currentTouchData && elm.classList) {
                for (var i = 0, len = elm.classList.length; i < len; i++) {
                    var t = touchClasses[elm.classList.item(i)];
                    if (t) currentTouchData = t;
                }
            }
            if (currentTouchData || !elm.parentNode) checkParent = false;
            if (checkParent) elm = elm.parentNode
        }while(checkParent);

        if (currentTouchData){
            currentTouchData.drag = currentTouchData.defaultDrag || currentTouchData.dragY || currentTouchData.dragX;
            if (currentTouchData.onTouchDown) currentTouchData.onTouchDown();

            var preventDefault = false;
            if (currentTouchData.drag) preventDefault = true;

            // Don't use Classlist - buggy in IOS6
            if (elm && elm.className){
                var className = elm.className;

                // in IOS6 this is can be an SVGAnimatedString object ....
                if (className.baseVal) className = className.baseVal;

                if (className.indexOf("preventDefault")>=0) preventDefault = true;
            }

            if (preventDefault) event.preventDefault();

            touchEvents.isMultiTouch = false;

            touchEvents.srcElement = elm;
            currentTouchData.originalElm = originalElm;
            touchEvents.source = source;

            if (event.targetTouches){
                var touch = event.targetTouches[0];
                touchEvents.startX = touch.pageX;
                touchEvents.startY = touch.pageY;

                if (event.targetTouches.length > 1){
                    touchEvents.isMultiTouch = true;
                    touch = event.targetTouches[1];
                    touchEvents.startX2 = touch.pageX;
                    touchEvents.startY2 = touch.pageY;

                    touchEvents.startDistance = getDistance(touchEvents.startX,touchEvents.startY,touchEvents.startX2,touchEvents.startY2);
                    touchEvents.startAngle = getAngle(touchEvents.startX,touchEvents.startY,touchEvents.startX2,touchEvents.startY2);
                }

            }else{
                // no touchscreen
                if (event.pageX){
                    touchEvents.startX = event.pageX;
                    touchEvents.startY = event.pageY;
                }
            }

            touchEvents.currentX = touchEvents.startX;
            touchEvents.currentY = touchEvents.startY;
            touchEvents.lastDragX = touchEvents.startX;
            touchEvents.lastDragY = touchEvents.startY;

            touchEvents.startTime = new Date().getTime();
            touchEvents.isDown = true;

            if (currentTouchData.clone){
                var clone = getCloneElement();
                clone.innerHTML = elm.innerHTML;

                // TODO: fix getPosition for position:fixed elements;
                //var pos = getPosition(touchEvents.srcElement);

                var pos = getPosition(touchEvents.srcElement);
                pos.x = pos.left;
                pos.y = pos.top;

                clone.style.left= pos.x + "px";
                clone.style.top= pos.y + "px";

                touchEvents.originalElement = touchEvents.srcElement;
                touchEvents.srcElement = clone;
            }

            if (currentTouchData.isElastic){
                touchEvents.srcElement.className = "";

                // keep track of time based last dragoffset to calculate swipe speed
                if (touchEvents.updateDragSpeedInterval === false){
                    touchEvents.updateDragSpeedInterval = setInterval(function(){
                        touchEvents.lastDragX = touchEvents.currentX;
                        touchEvents.lastDragY = touchEvents.currentY;
                    },200);
                }
            }

            currentTouchData.posX = currentTouchData.posX || 0;
            currentTouchData.posy = currentTouchData.posY || 0;
            currentTouchData.lastPosX = currentTouchData.lastPosX || 0;
            currentTouchData.lastPosY = currentTouchData.lastPosY || 0;
            currentTouchData.lastScale = currentTouchData.lastScale || 1;
            currentTouchData.lastRotation = currentTouchData.lastRotation || 0;


            if (currentTouchData.onDown) currentTouchData.onDown(touchEvents);

        }

    }

    function handleTouchMove(event,source){
        if (touchEvents.isDown){

            if (event.targetTouches){

                var touch = event.targetTouches[0];
                touchEvents.currentX = touch.pageX;
                touchEvents.currentY = touch.pageY;

                if (event.targetTouches.length>1){
                    touch = event.targetTouches[1];
                    touchEvents.currentX2 = touch.pageX;
                    touchEvents.currentY2 = touch.pageY;

                    touchEvents.currentDistance = getDistance(touchEvents.currentX,touchEvents.currentY,touchEvents.currentX2,touchEvents.currentY2);
                    touchEvents.currentAngle = getAngle(touchEvents.currentX,touchEvents.currentY,touchEvents.currentX2,touchEvents.currentY2);

                    //scale
                    touchEvents.currentScale = touchEvents.currentDistance / touchEvents.startDistance;

                    //rotation
                    touchEvents.currentRotation = touchEvents.currentAngle - touchEvents.startAngle;
                }


            }else{
                // no touchscreen
                if (event.pageX){
                    touchEvents.currentX = event.pageX;
                    touchEvents.currentY = event.pageY;
                }
            }

            touchEvents.deltaX = touchEvents.currentX - touchEvents.startX;
            touchEvents.deltaY = touchEvents.currentY - touchEvents.startY;


            if (touchEvents.srcElement && currentTouchData){

                if (currentTouchData.onDrag) currentTouchData.onDrag(touchEvents);
                if (currentTouchData.dragY) touchEvents.deltaX = 0;
                // only drag on Y axis


                currentTouchData.posX = touchEvents.deltaX + currentTouchData.lastPosX;
                currentTouchData.posY = touchEvents.deltaY + currentTouchData.lastPosY;

                currentTouchData.scale = currentTouchData.lastScale + (touchEvents.isMultiTouch ? (touchEvents.currentScale-1) : 0);
                currentTouchData.rotation = currentTouchData.lastRotation + (touchEvents.isMultiTouch ? (touchEvents.currentRotation) : 0);

                if (currentTouchData.drag){

                    if (currentTouchData.dropZones){
                        // check for dropzones;
                        var dropZone = getDropZone(event.srcElement);
                        if (touchEvents.dropZone && touchEvents.dropZone != dropZone){
                            touchEvents.dropZone.classList.remove("dragover");
                        }
                        if (dropZone){
                            dropZone.classList.add("dragover");
                        }
                        touchEvents.dropZone = dropZone;
                    }

                    var distance = getDistance(currentTouchData.posX,currentTouchData.posY,0,0);
                    if (currentTouchData.clone){
                        if (distance>minDragDistance){
                            showCloneElement();
                        }else{
                            hideCloneElement();
                        }
                    }
                }

                //currentTouchData.scale = 2;
                //currentTouchData.rotation = 30;
                var transform = "";
                if (currentTouchData.drag) transform += "translate3d("+currentTouchData.posX+"px,"+currentTouchData.posY+"px, 0) ";
                if (currentTouchData.defaultScale) transform += "scale3d("+currentTouchData.scale+","+currentTouchData.scale+", 1) ";
                if (currentTouchData.defaultRotate) transform += "rotate("+currentTouchData.rotation+"deg) ";

                if (transform != ""){
                    try{
                        touchEvents.srcElement.style.webkitTransform = transform;
                    }catch(e){
                        //TODO: why error after cancelTouch?
                    }
                }
            }
        }
    }

    function handleTouchEnd(event,source){

        if (touchEvents.isDown){
            currentTouchData.lastPosX = currentTouchData.posX;
            currentTouchData.lastPosY = currentTouchData.posY;
            currentTouchData.lastScale = currentTouchData.scale;
            currentTouchData.lastRotation = currentTouchData.rotation;

            clearInterval(touchEvents.updateDragSpeedInterval);
            touchEvents.updateDragSpeedInterval = false;

            if (currentTouchData.clone){
                removeCloneElement();
            }

            var swipeTime = new Date().getTime() - touchEvents.startTime;
            touchEvents.deltaX = touchEvents.currentX - touchEvents.startX;
            touchEvents.deltaY = touchEvents.currentY - touchEvents.startY;
            var distance = getDistance(currentTouchData.posX,currentTouchData.posY,0,0);

            if (currentTouchData.drag && currentTouchData.snapBack){
                currentTouchData.lastPosX = 0;
                currentTouchData.lastPosY = 0;
                currentTouchData.posX = 0;
                currentTouchData.posY = 0;
                var transform = "translate3d(0px,0px, 0) ";
                touchEvents.srcElement.style.webkitTransform = transform;
            }

            if (touchEvents.dropZone){
                touchEvents.dropZone.classList.remove("dragover");
            }

            var tapped = false;

            if (Math.abs(touchEvents.deltaX)<minSwipeDistance && Math.abs(touchEvents.deltaY)<minSwipeDistance){
                if (swipeTime < maxTapDelay){
                    //tap
                    //TODO don't trigger if double tap is defined
                    tapped = true;
                }
            }else{
                if (currentTouchData.onSwiped) currentTouchData.onSwiped(touchEvents.deltaX,touchEvents.deltaY);
            }

            if (currentTouchData.drag){
                if (distance >= minDragDistance){
                    tapped = false;
                    if (currentTouchData.onDrop) currentTouchData.onDrop(touchEvents);
                }
            }

            if (tapped && currentTouchData.onTap) currentTouchData.onTap(touchEvents.originalElement);
            if (currentTouchData.onTouchEnd) currentTouchData.onTouchEnd(tapped);

            if (currentTouchData.isElastic){
                if (currentTouchData.onStartElasticScroll){
                    // set elastic Scroll boundaries
                    currentTouchData.onStartElasticScroll();
                }

                var lastDelta = touchEvents.lastDragY - touchEvents.currentY;
                if (swipeTime<200) lastDelta = 0-touchEvents.deltaY;
                var speed = Math.min(Math.abs(lastDelta/swipeTime)*2,1);

                var targetCoordinate = currentTouchData.posY - (speed * lastDelta * 2.5);

                var cssSpeedClass = "animate_easeout_slow";
                if (typeof currentTouchData.maxDragY == "number") {
                    if (targetCoordinate > currentTouchData.maxDragY) cssSpeedClass = "animate_easeout_fast";
                    targetCoordinate = Math.min(targetCoordinate,currentTouchData.maxDragY);
                }
                if (typeof currentTouchData.minDragY == "number") {
                    if (targetCoordinate < currentTouchData.minDragY) cssSpeedClass = "animate_easeout_fast";
                    targetCoordinate = Math.max(targetCoordinate,currentTouchData.minDragY);
                }
                currentTouchData.lastPosY = targetCoordinate;

                touchEvents.srcElement.className = cssSpeedClass;

                var transform = "";
                if (currentTouchData.drag) transform += "translate3d("+currentTouchData.posX+"px,"+targetCoordinate+"px, 0) ";
                if (currentTouchData.defaultScale) transform += "scale3d("+currentTouchData.scale+","+currentTouchData.scale+", 1) ";
                if (currentTouchData.defaultRotate) transform += "rotate("+currentTouchData.rotation+"deg) ";

                if (transform != ""){
                    touchEvents.srcElement.style.webkitTransform = transform;
                }
            }

        }

        touchEvents.isDown = false;
        touchEvents.isMouseDown = true;
        touchEvents.srcElement = undefined;
        touchEvents.dropZone = undefined;
        touchEvents.deltaX = 0;
        touchEvents.deltaY = 0;

        if (typeof source == "undefined"){
            // event is from a touch, not from a (simulated) mouse click.
            touchEvents.handledTouch = true;
        }

    }


    var cancelTouch = function(){
        handleTouchEnd(undefined,touchEvents.source);
    };

    var startTouch = function(elm){
        var properties = touchData[elm.id];

        var pageOffset = getPageOffsetLeft();

        var event = {
            srcElement: elm,
            preventDefault : function(){},
            pageX : properties.lastPosX + pageOffset,
            pageY : properties.lastPosY
        };

        handleTouchStart(event);
    };


    function getCloneElement(){
        var elm = touchEvents.cloneElement;
        if (!elm){
            elm = document.createElement("div");
            elm.id = "dragClone";
            elm.style.position = "absolute";
            elm.style.pointerEvents = "none";
            elm.className = "dragging";

            document.body.appendChild(elm);
            touchEvents.cloneElement = elm;
        }
        elm.style.opacity = 0;
        elm.style.display = "block";
        elm.style.webkitTransition = "opacity 0.5s ease-in-out";
        return elm;
    }

    function showCloneElement(){
        var elm = touchEvents.cloneElement;
        if (elm){
            elm.style.opacity = 1;
        }
    }

    function hideCloneElement(){
        var elm = touchEvents.cloneElement;
        if (elm){
            elm.style.opacity = 0;
        }
    }

    function removeCloneElement(){
        var elm = touchEvents.cloneElement;
        if (elm){
            elm.innerHTML = "";
            elm.style.display = "none";
        }
    }

    function getDropZone(elm){
        var dropZone;
        var level = 0;
        var maxLevel = 4; // maximum steps to bubble up in the DOM;
        while (!dropZone && elm && level<maxLevel) {
            if (isValidDropZone(elm)) dropZone = elm;
            level++;
            elm = elm.parentElement;
        }
        return dropZone;
    }

    function isValidDropZone(elm){
        var result = false;
        if (currentTouchData.dropZones){
            var i = 0;
            var len = currentTouchData.dropZones.length;
            while (i<len && !result){
                var selector = currentTouchData.dropZones[i];
                var selectorType = getSelectorType(selector);
                switch (selectorType){
                    case SELECTORTYPE.ID:
                        result = (elm.id == selector);
                            break;
                    case SELECTORTYPE.CLASS:
                        result = elm.classList.contains(selector.substr(1));
                        break;
                }
                i++;
            }
        }
        return result;
    }

    // util

    // get distance between 2 points
    function getDistance(x1, y1, x2, y2) {
        var x = x2 - x1;
        var y = y2 - y1;
        return Math.sqrt((x * x) + (y * y));
    }


    // get angle between 2 points
    function getAngle(x1, y1, x2, y2) {
        var x = x2 - x1;
        var y = y2 - y1;
        return Math.atan2(y, x) * 180 / Math.PI;
    }

    // get position of an element on the page
    function getPosition(elm) {
        var x = 0;
        var y = 0;

        while(elm) {
            x += (elm.offsetLeft - elm.scrollLeft + elm.clientLeft);
            y += (elm.offsetTop - elm.scrollTop + elm.clientTop);
            elm = elm.offsetParent;
        }

        return { x: x, y: y };
    }

    init();

    return {
        init: init,
        cancelTouch: cancelTouch,
        startTouch: startTouch,
        add: addTouchEvent
    }
}());