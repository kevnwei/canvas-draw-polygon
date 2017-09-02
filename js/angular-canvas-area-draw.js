'use strict';
(function(window) {
    angular.module('sd.canvas-area-draw', []);
    angular.module('sd.canvas-area-draw')
        .directive('canvasAreaDraw', function () {
            return {
                restrict: 'A',
                scope: {
                    imageUrl: '=',
                    enabled: '=',
                    palette: '=',
                    points: '=',
                    active: '=',
                    color: '=',
                    colors: '=',
                    rectmode: '=',
                    viewmode: '=',
                    imagesize: '=',
                    scaleSize: '='
                },
                controller: function () {
                    this.dotLineLength = function(x, y, x0, y0, x1, y1, o) {
                        function lineLength(x, y, x0, y0){
                            return Math.sqrt((x -= x0) * x + (y -= y0) * y);
                        }
                        if(o && !(o = function(x, y, x0, y0, x1, y1){
                                if(!(x1 - x0)) return {x: x0, y: y};
                                else if(!(y1 - y0)) return {x: x, y: y0};
                                var left, tg = -1 / ((y1 - y0) / (x1 - x0));
                                return {x: left = (x1 * (x * tg - y + y0) + x0 * (x * - tg + y - y1)) / (tg * (x1 - x0) + y0 - y1), y: tg * left - tg * x + y};
                            }(x, y, x0, y0, x1, y1), o.x >= Math.min(x0, x1) && o.x <= Math.max(x0, x1) && o.y >= Math.min(y0, y1) && o.y <= Math.max(y0, y1))){
                            var l1 = lineLength(x, y, x0, y0), l2 = lineLength(x, y, x1, y1);
                            return l1 > l2 ? l2 : l1;
                        }
                        else {
                            var a = y0 - y1, b = x1 - x0, c = x0 * y1 - y0 * x1;
                            return Math.abs(a * x + b * y + c) / Math.sqrt(a * a + b * b);
                        }
                    };
                    this.hexToRgb = function(hex){
                        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
                        return result ? {
                            r: parseInt(result[1], 16),
                            g: parseInt(result[2], 16),
                            b: parseInt(result[3], 16)
                        } : null;
                    };
                    this.getMousePos = function (canvas, evt) {
                        var rect = canvas.getBoundingClientRect();
                        return {
                            x: evt.clientX - rect.left,
                            y: evt.clientY - rect.top
                        };
                    };
                    this.isInside = function (x, y, points) {
                        var minX = x, maxX = x, minY = y, maxY = y;
                        for (var i = points.length - 1; i >= 0 ; --i) {
                            minX = x, maxX = x, minY = y, maxY = y;
                            for (var j = 0; j < points[i].length; ++j) {
                                minX = minX > points[i][j][0] ? points[i][j][0] : minX;
                                maxX = maxX < points[i][j][0] ? points[i][j][0] : maxX;
                                minY = minY > points[i][j][1] ? points[i][j][1] : minY;
                                maxY = maxY < points[i][j][1] ? points[i][j][1] : maxY;
                            }
                            if (x > minX && x < maxX && y > minY && y < maxY) {
                                return true;
                            }
                        }
                        return false;
                    };
                },
                link: function(scope, element, attrs, ctrl){
                    var activePoint, settings = {};
                    var $canvas, ctx, image;
                    var rectPoint = {};
                    var dragPoint = {};
                    var gDrag = false;
                    var gMagnify = false;
                    var scrollPoint = {};
                    var IMG_WIDTH = 0;
                    var IMG_HEIGHT = 0;
                    var wdRate = 0;

                    settings.imageUrl = scope.imageUrl;
                    if(!scope.points) {
                        scope.points = [[]];
                    }
                    if(!scope.active) {
                        scope.active = 0;
                    }

                    $canvas = $('<canvas>');
                    $canvas.attr('id', 'mycanvas');
                    ctx = $canvas[0].getContext('2d');

                    scope.resize = function() {
                        if (IMG_WIDTH == 0 || IMG_HEIGHT == 0) {
                            IMG_WIDTH = image.naturalWidth;
                            IMG_HEIGHT = image.naturalHeight;
                            wdRate = IMG_WIDTH / IMG_HEIGHT;
                            scope.imagesize = IMG_WIDTH;
                            //image.width = 2048;
                            scope.scaleSize = image.width / IMG_WIDTH;
                            //image.height = scope.scaleSize * IMG_HEIGHT;
                        }
                        $canvas.attr('height', image.height).attr('width', image.width);
                        scope.draw();
                        scope.record();
                    };
                    
                    image = new Image();
                    image.src = settings.imageUrl;
                    $(image).load(scope.resize);
                    $canvas.css({background: 'url('+image.src+')'});
                    $canvas.css({backgroundSize: 'contain'});
                    $(element).append($canvas);

                    scope.move = function(e) {
                        if(!e.offsetX) {
                            e.offsetX = (e.pageX - $(e.target).offset().left);
                            e.offsetY = (e.pageY - $(e.target).offset().top);
                        }
                        var points = scope.points[scope.active];
                        points[activePoint][0] = Math.round(e.offsetX);
                        points[activePoint][1] = Math.round(e.offsetY);
                        scope.record();
                        scope.draw();
                    };

                    scope.stopdrag = function() {
                        if (scope.rectmode) {
                            gDrag = false;
                            return false;
                        }
                        element.off('mousemove');
                        scope.record();
                        activePoint = null;
                    };

                    scope.rightclick = function(e) {
                        e.preventDefault();
                        if (scope.viewmode) {
                            return false;
                        }
                        if(!e.offsetX) {
                            e.offsetX = (e.pageX - $(e.target).offset().left);
                            e.offsetY = (e.pageY - $(e.target).offset().top);
                        }
                        var x = e.offsetX, y = e.offsetY;
                        var points = scope.points[scope.active];
                        if (points){
                            for (var i = 0; i < points.length; ++i) {
                                var dis = Math.sqrt(Math.pow(x - points[i][0], 2) + Math.pow(y - points[i][1], 2));
                                if ( dis < 6 ) {
                                    points.splice(i, 1);
                                    scope.draw();
                                    scope.record();
                                    return false;
                                }
                            }
                        }
                        
                        if (ctrl.isInside(x, y, scope.points)) {
                            $('#right-menu').css('display', 'block').css('left', e.pageX + 'px').css('top', e.pageY + 'px');
                            return false;
                        }

                        return false;
                    };

                    scope.mousedown = function(e) {
                        if (e.which === 3) {
                            return false;
                        }
                        
                        $('#right-menu').hide();
                        if (gMagnify) {
                            scope.magnify(e);
                            return false;
                        }
                        if (scope.viewmode && e.button == 0) {// e.which === 1
                            scope.setScrollPoint(e);
                            return false;
                        }
                        if (!scope.rectmode && scope.points.length == 0) {
                            scope.points.push([]);
                            scope.colors.push([scope.color]);
                            scope.active = scope.points.length - 1;
                        }
                        var points = scope.points[scope.active];
                        var x, y, dis, minDis = 0, minDisIndex = -1;
                        e.preventDefault();
                        if(!e.offsetX) {
                            e.offsetX = (e.pageX - $(e.target).offset().left);
                            e.offsetY = (e.pageY - $(e.target).offset().top);
                        }
                        var mousePos = ctrl.getMousePos($canvas[0], e);
                        x = mousePos.x; y = mousePos.y;
                        
                        if (scope.rectmode) {
                            if (scope.setDragPoint(x, y)) {
                                return false;
                            }
                        }
                        
                        if (points) {
                            for (var i = 0; i < points.length; ++i) {
                                dis = Math.sqrt(Math.pow(x - points[i][0], 2) + Math.pow(y - points[i][1], 2));
                                if(minDisIndex == -1 || minDis > dis) {
                                    minDis = dis;
                                    minDisIndex = i;
                                }
                            }
                        }
                        if ( minDis < 6 && minDisIndex >= 0 ) {
                            if (scope.rectmode) {
                                scope.resizeRect(points, minDisIndex);
                                return false;
                            }
                            activePoint = minDisIndex;
                            element.on('mousemove', scope.move);
                            return false;
                        } else if (scope.rectmode) {
                            scope.setDrawRect(x, y);
                            return false;
                        }

                        scope.setDrawPloygon(points, x, y);
                        return false;
                    };

                    scope.setDrawPloygon = function(points, x, y) {
                        var lineDis;
                        var insertAt = points ? points.length : 0
                        for (var i = 0; i < points.length; ++i) {
                            if (i > 1) {
                                lineDis = ctrl.dotLineLength(
                                    x, y,
                                    points[i][0], points[i][1],
                                    points[i-1][0], points[i-1][1],
                                    true
                                );
                                if (lineDis < 6) {
                                    insertAt = i;
                                }
                            }
                        }

                        points.splice(insertAt, 0, [Math.round(x), Math.round(y)]);
                        activePoint = insertAt;
                        element.on('mousemove', scope.move);
                        scope.draw();
                        scope.record();
                    };
                    
                    scope.setDragPoint = function(x, y) {
                        var minX = x, maxX = x, minY = y, maxY = y;
                        for (var i = scope.points.length - 1; i >= 0 ; --i) {
                            minX = x, maxX = x, minY = y, maxY = y;
                            for (var j = 0; j < scope.points[i].length; ++j) {
                                minX = minX > scope.points[i][j][0] ? scope.points[i][j][0] : minX;
                                maxX = maxX < scope.points[i][j][0] ? scope.points[i][j][0] : maxX;
                                minY = minY > scope.points[i][j][1] ? scope.points[i][j][1] : minY;
                                maxY = maxY < scope.points[i][j][1] ? scope.points[i][j][1] : maxY;
                            }
                            if (x > minX && x < maxX && y > minY && y < maxY) {
                                scope.active = i;
                                scope.draw();
                                scope.record();
                                dragPoint.x = x;
                                dragPoint.y = y;
                                gDrag = true;
                                return true;
                            }
                        }
                        return false;
                    };
                    
                    scope.setScrollPoint = function(e) {
                        gDrag = true;
                        scrollPoint.x = e.clientX;
                        scrollPoint.y = e.clientY;
                        $(element).css("cursor","move");
                    };
                    
                    scope.resizeRect = function(points, minDisIndex) {
                        gDrag = true;
                        var j = (minDisIndex + 2) % 4;
                        rectPoint.startX = points[j][0];
                        rectPoint.startY = points[j][1];
                        dragPoint = {};
                    };
                    
                    scope.setDrawRect = function(x, y) {
                        scope.points.push([]);
                        scope.colors.push([scope.color]);
                        scope.active = scope.points.length - 1;
                        rectPoint.startX = x;
                        rectPoint.startY = y;
                        dragPoint = {};
                        gDrag = true;
                    };
                    
                    scope.mousemove = function(e) {
                        if (gDrag) {
                            scope.viewmode ? scope.scroll(e) : (dragPoint && dragPoint.x && dragPoint.y ? scope.drag(e) : scope.drawRect(e));
                        } else {
                            scope.over(e);
                        }
                    };

                    scope.scroll = function(e) {
                        var x = e.clientX;
                        var y = e.clientY;
                        if (typeof scrollPoint.x != 'undefined') {
                            window.scrollBy(scrollPoint.x - x, scrollPoint.y - y);
                        }
                        scrollPoint.x = x;
                        scrollPoint.y = y;
                    };

                    scope.over = function(e) {
                        if (scope.rectmode && !gMagnify && !scope.viewmode) {
                            e.preventDefault();
                            if(!e.offsetX) {
                                e.offsetX = (e.pageX - $(e.target).offset().left);
                                e.offsetY = (e.pageY - $(e.target).offset().top);
                            }
                            var mousePos = ctrl.getMousePos($canvas[0], e);
                            var x = mousePos.x; var y = mousePos.y;
                            var minX = x, maxX = x, minY = y, maxY = y;
                            $(element).css("cursor","default");
                            for (var i = scope.points.length - 1; i >= 0 ; --i) {
                                minX = x, maxX = x, minY = y, maxY = y;
                                for (var j = 0; j < scope.points[i].length; ++j) {
                                    minX = minX > scope.points[i][j][0] ? scope.points[i][j][0] : minX;
                                    maxX = maxX < scope.points[i][j][0] ? scope.points[i][j][0] : maxX;
                                    minY = minY > scope.points[i][j][1] ? scope.points[i][j][1] : minY;
                                    maxY = maxY < scope.points[i][j][1] ? scope.points[i][j][1] : maxY;
                                }
                                if (x > minX && x < maxX && y > minY && y < maxY) {
                                    $(element).css("cursor","move");
                                    break;
                                }
                            }
                        }
                    };
                    
                    scope.drag = function(e) {
                        var x, y;
                        e.preventDefault();
                        if(!e.offsetX) {
                            e.offsetX = (e.pageX - $(e.target).offset().left);
                            e.offsetY = (e.pageY - $(e.target).offset().top);
                        }
                        var mousePos = ctrl.getMousePos($canvas[0], e);
                        x = mousePos.x; y = mousePos.y;
                        
                        var movePts = scope.active;
                        var points = scope.points[movePts];
                        var deltaX = x - dragPoint.x;
                        var deltaY = y - dragPoint.y;
                        for (var i = 0; i < points.length; ++i) {
                            scope.points[movePts][i][0] += deltaX;
                            scope.points[movePts][i][1] += deltaY;
                            scope.points[movePts][i][0] = parseInt(scope.points[movePts][i][0]);
                            scope.points[movePts][i][1] = parseInt(scope.points[movePts][i][1]);
                        }
                        var insertAt = 0;
                        dragPoint.x = x;
                        dragPoint.y = y;
                        activePoint = insertAt;
                        scope.draw();
                        scope.record();
                    };
                    
                    scope.drawRect = function(e) {
                        e.preventDefault();
                        scope.points[scope.active] = [];
                        var points = scope.points[scope.active];
                        var x, y, dis, minDis = 0, minDisIndex = -1, lineDis, insertAt = points.length;
                        if(!e.offsetX) {
                            e.offsetX = (e.pageX - $(e.target).offset().left);
                            e.offsetY = (e.pageY - $(e.target).offset().top);
                        }
                        var mousePos = ctrl.getMousePos($canvas[0], e);
                        x = mousePos.x; y = mousePos.y;
                        var x1 = rectPoint.startX, y1 = rectPoint.startY, x2 = x1, y2 = y, x3 = x, y3 = y, x4 = x, y4 = y1;
                        points.splice(insertAt, 0, [x1, y1], [x2, y2], [x3, y3], [x4, y4]);
                        activePoint = insertAt;
                        scope.draw();
                        scope.record();
                    };
                    
                    scope.draw = function() {
                        ctx.canvas.width = ctx.canvas.width;
                        if(scope.points.length > 0) {
                            scope.drawSingle(scope.points[scope.active], scope.active);
                        }
                        for(var p = 0; p < scope.points.length; ++p) {
                            var points = scope.points[p];
                            if (points.length == 0 || scope.active == p) {
                                continue;
                            }
                            scope.drawSingle(points, p);
                        }
                    };

                    scope.drawSingle = function (points, p) {
                        var colorIndex = scope.colors[p][0];
                        var strokecolor = scope.palette[colorIndex];
                        ctx.globalCompositeOperation = 'destination-over';
                        ctx.fillStyle = 'rgb(255,255,255)';
                        ctx.strokeStyle = strokecolor;
                        ctx.lineWidth = 3;
                        ctx.beginPath();
                        for (var i = 0; i < points.length; ++i) {
                            if(scope.active == p) {
                                ctx.fillRect(points[i][0] - 2, points[i][1] - 2, 4, 4);
                                ctx.strokeRect(points[i][0] - 2, points[i][1] - 2, 4, 4);
                            }
                            ctx.lineTo(points[i][0], points[i][1]);
                        }
                        ctx.closePath();
                        var fillColor = ctrl.hexToRgb(strokecolor);
                        ctx.fillStyle = 'rgba(' + fillColor.r + ',' + fillColor.g + ',' + fillColor.b + ',0.3)';
                        ctx.fill();
                        ctx.stroke();
                    };

                    scope.magnify = function (e) {
                        var preWidth = image.width;
                        image.width  = IMG_WIDTH;
                        image.height = IMG_HEIGHT;
                        scope.scaleSize = image.width / preWidth;
                        scope.scalePoints();
                        scope.resize();
                        var x = ((0.5 + (e.offsetX * scope.scaleSize)) | 0) - e.offsetX;
                        var y = ((0.5 + (e.offsetY * scope.scaleSize)) | 0) - e.offsetY;
                        window.scrollBy(x, y);
                        gMagnify = false;
                        $(element).css("cursor","default");
                    };
                    
                    scope.scale = function (e) {
                        var steps = parseInt(IMG_WIDTH / 8);
                        var delta = e.originalEvent.wheelDelta > 0 ? steps : -steps;
                        if (delta < 0 && image.width < (window.screen.availWidth)) {
                            return false;
                        }
                        if (delta > 0 && image.width >= IMG_WIDTH) {
                            return false;
                        }

                        e.preventDefault();
                        var preWidth = image.width;
                        image.width += delta;
                        image.height += Math.round(delta / wdRate);
                        scope.scaleSize = image.width / preWidth;
                        scope.scalePoints();
                        scope.resize();
                        var x = ((0.5 + (e.offsetX * scope.scaleSize)) | 0) - e.offsetX;
                        var y = ((0.5 + (e.offsetY * scope.scaleSize)) | 0) - e.offsetY;
                        window.scrollBy(x, y);
                    };
                    
                    scope.scalePoints = function () {
                        for (var i = scope.points.length - 1; i >= 0 ; --i) {
                            for (var j = 0; j < scope.points[i].length; ++j) {
                                scope.points[i][j][0] = scope.points[i][j][0] * scope.scaleSize;
                                scope.points[i][j][1] = scope.points[i][j][1] * scope.scaleSize;
                            }
                        }
                    };

                    scope.mouseup = function(e) {
                        gDrag = false;
                        $(element).css("cursor","default");
                    };

                    scope.record = function() {
                        scope.$apply();
                    };

                    scope.$watch('points', function (newVal, oldVal) {
                        scope.draw();
                    }, true);

                    scope.$watch('colors', function (newVal, oldVal) {
                        scope.draw();
                    }, true);

                    scope.$watch('active', function (newVal, oldVal) {
                        if (newVal != oldVal) scope.draw();
                    });

                    scope.keydown = function (e) {
                        var currKey = e.keyCode || e.which || e.charCode;
                        switch (currKey) {
                            case 65 || 97:
                                // press a
                                scope.color = 0;
                                break;
                            case 66 || 98:
                                // press b
                                scope.color = 1;
                                break;
                            case 67 || 99:
                                // press c
                                scope.color = 2;
                                break;
                            case 68 || 100:
                                //press d
                                if (scope.active >= 0) {
                                    scope.points.splice(scope.active, 1);
                                    scope.colors.splice(scope.active, 1);
                                    scope.active = scope.points.length - 1;
                                    scope.draw();
                                    scope.record();
                                }
                                break;
                            case 69 || 101:
                                // press e
                                $(element).css({cursor:"url(./images/magnifier.png),auto"});
                                gMagnify = true;
                                break;
                            case 70 || 102:
                                // press f
                                scope.rectmode = !scope.rectmode;
                                if (!scope.rectmode) {
                                    scope.points.push([]);
                                    scope.colors.push([scope.color]);
                                    scope.active = scope.points.length - 1;
                                }
                                break;
                            case 90 || 122:
                                //press ctrl + z
                                if (e.ctrlKey) {
                                    scope.points[scope.active].splice(-1, 1);
                                    scope.draw();
                                    scope.record();
                                }
                                break;
                            default:
                                break;
                        }
                    };

                    $canvas.on('mousedown', scope.mousedown);
                    $canvas.on('mouseup', scope.mouseup);
                    $canvas.on('contextmenu', scope.rightclick);
                    $canvas.on('mouseup', scope.stopdrag);
                    $canvas.on('mousemove', scope.mousemove);
                    $canvas.on('mousewheel', scope.scale);
                    $(document).on('keydown', scope.keydown);
                }
            };
        });
}(this));