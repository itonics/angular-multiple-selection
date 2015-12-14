/**
 * Angular JS multiple-selection module
 * @author Maksym Pomazan
 * @version 0.0.3
 */

function offset(element) {
    var documentElem,
        box = {
            top: 0,
            left: 0
        },
        doc = element && element.ownerDocument;
    documentElem = doc.documentElement;

    if(typeof element.getBoundingClientRect !== undefined) {
        box = element.getBoundingClientRect();
    }

    return {
        top: box.top + (window.pageYOffset || documentElem.scrollTop) - (documentElem.clientTop || 0),
        left: box.left + (window.pageXOffset || documentElem.scrollLeft) - (documentElem.clientLeft || 0)
    };
}
angular.module('multipleSelection', [])
    .directive('multipleSelectionItem', ['$timeout', function($timeout) {
        return {
            restrict: 'A',
            require: ["^multipleSelectionZone"],
            controller: function($scope) {
            },
            link: function(scope, element, attrs, ctrls) {
                var selectionZoneCtrl = ctrls[0];
                var selectingClass = selectionZoneCtrl.selectingClass || "isSelecting";
                var selectedClass = selectionZoneCtrl.selectedClass || "isSelected";

                if(selectionZoneCtrl.multipleSelectionZone === false || selectionZoneCtrl.multipleSelectionZone === 'false') {
                } else {
                    activateItemLink();
                }

                function activateItemLink() {
                    scope.linkTriggered = false;
                    scope.itemData = {};
                    scope.itemData.uri = scope.$eval(attrs.multipleSelectionItem);
                    scope.itemData.type = (attrs.multiSelItemType && typeof attrs.multiSelItemType !== 'undefined')?scope.$eval(attrs.multiSelItemType):'';
                    //scope.itemData = angular.copy(scope.$eval(attrs.multipleSelectionItem));
                    var initClickPosition = {}, finalClickPosition = {};

                    if(!scope.itemData.element) {
                        scope.itemData.element = [];
                    }
                    //scope.itemData['uri'] = scope.itemData['uri'] ? scope.itemData['uri'] : selectionZoneCtrl.getAllSelectables().length;
                    scope.itemData.element.push(element);
                    selectionZoneCtrl.populate(scope.itemData);


                    scope.$watchGroup([function() {
                        return scope.itemData.selecting;
                    }, function() {
                        return scope.itemData.selected;
                    }], function(vals) {
                        if(vals[0]) {
                            element.addClass(selectingClass);
                        } else {
                            element.removeClass(selectingClass);
                        }

                        if(vals[1]) {
                            element.addClass(selectedClass);
                        } else {
                            element.removeClass(selectedClass);
                        }
                    });


                    element.on('mousedown.multi-select', function(event, optEvtData) {
                        initClickPosition = {
                            x: event.clientX,
                            y: event.clientY
                        };

                        if(optEvtData && typeof optEvtData === 'object') {
                            initClickPosition = {
                                x: optEvtData.clientX,
                                y: optEvtData.clientY
                            };
                        }

                        selectionZoneCtrl.childItemClicked = scope.mouseDown = true;
                        if(!selectionZoneCtrl.enableItemDragSelection || scope.itemData["selected"]) {
                            event.preventDefault();
                            event.stopPropagation();
                        }
                    });

                    element.on('mouseup.multi-select touchend.multi-select', function(event, optEvtData) {

                        finalClickPosition = {
                            x: event.clientX,
                            y: event.clientY
                        };

                        if(optEvtData && typeof optEvtData === 'object') {
                            finalClickPosition = {
                                x: optEvtData.clientX,
                                y: optEvtData.clientY
                            };
                            event.which = optEvtData.which;
                        }

                        if(scope.linkTriggered) {
                            scope.linkTriggered = false;
                            return;
                        }

                        if(event.which == 1) {
                            if(!selectionZoneCtrl.continuousSelection) {
                                if(scope.itemData.selected) {
                                    if(!event.ctrlKey) {
                                        selectionZoneCtrl.deselectAll(scope.itemData['uri']);
                                    } else {
                                        scope.itemData.selected = false;
                                    }
                                } else {
                                    if(!event.ctrlKey && !selectionZoneCtrl.isDragSelection) {
                                        selectionZoneCtrl.deselectAll(scope.itemData['uri']);
                                    }
                                    scope.itemData.selected = true;
                                }
                            } else {
                                if(initClickPosition.x === finalClickPosition.x || initClickPosition.y === finalClickPosition.y) {
                                    scope.itemData.selected = !scope.itemData.selected;
                                }
                            }

                            scope.mouseDown = selectionZoneCtrl.childItemClicked = selectionZoneCtrl.isDragSelection = false;
                            scope.linkTriggered = false;
                            selectionZoneCtrl.updateSelectedData(scope.itemData);
                        }

                        //event.stopImmediatePropagation();
                    });

                    element.on('click mousedown mouseup touchstart touchend', 'a', function(event) {
                        if(event.type === 'mousedown') {
                            if(selectionZoneCtrl.enableItemDragSelection) {
                                event.stopPropagation();
                            }

                            scope.linkTriggered = true;
                            $timeout(function() {
                                scope.linkTriggered = false;
                            }, 500);
                        }
                        if(event.type === 'mouseup') {
                            $timeout(function() {
                                scope.linkTriggered = false;
                            }, 10);
                        }

                        //selectionZoneCtrl.onLinkEvtTrigger(event);
                        //event.stopPropagation();
                    });

                    scope.$on('$destroy', function() {
                        selectionZoneCtrl.remove(scope.itemData);
                    });
                }
            }
        };
    }])
    .directive('multipleSelectionZone', ['$document', '$timeout', '$parse', function($document, $timeout, $parse) {
        return {
            restrict: 'A',
            scope: {
                selectedData: "=?",
                multipleSelectionZone: "@"
            },
            controller: function($scope) {
                this.multipleSelectionZone = $scope.multipleSelectionZone;
                var self = this;

                if($scope.multipleSelectionZone === 'false' || $scope.multipleSelectionZone === false) {
                    //console.log("Multi-selection-zone disabled!");
                } else {
                    activateController();
                }

                function activateController() {
                    $scope.allSelectables = [];
                    self.selectingClass = $scope.selectingClass = "";
                    self.selectedClass = $scope.selectedClass = "";
                    // this variable enables continuous selection of the items without pressing 'ctrl' key
                    self.continuousSelection = $scope.continuousSelection = false;
                    // this variable enables drag selection of the items via directly dragging over an item which is by default disabled
                    self.enableItemDragSelection = $scope.enableItemDragSelection = false;
                    self.isDragSelection = false;
                    self.childItemClicked = false;

                    self.selectItem = $scope.selectItem = function(itemId) {
                        _.where($scope.allSelectables, {uri: itemId})[0]["selected"] = false;
                    };

                    self.getAllSelectables = $scope.getAllSelectables = function() {
                        return $scope.allSelectables;
                    };

                    self.getSelectedData = $scope.getSelectedData = function() {
                        return $scope.selectedData;
                    };

                    self.setSelectedData = $scope.setSelectedData = function(selData) {
                        selData = typeof selData === 'undefined' ? [] : selData;
                        $scope.selectedData = selData;
                    };

                    self.updateSelectedData = $scope.updateSelectedData = function(item) {
                        var exist = false;
                        var index = null;
                        var selData = $scope.selectedData;
                        for(var i = 0; i < selData.length; i++) {
                            if(selData[i].uri == item.uri) {
                                index = i;
                                exist = true;
                                break;
                            }
                        }
                        if(item.selected && !exist) {
                            selData.push(item);
                        } else if(!item.selected && exist) {
                            selData.splice(index, 1);
                        }

                        $scope.selectedData = selData;
                    };

                    self.setAllSelected = $scope.setAllSelected = function() {
                        var selected = [];
                        var children = $scope.allSelectables;
                        for(var i = 0; i < children.length; i++) {
                            if(_.where($scope.allSelectables, {uri: children[i]["uri"]})[0]["selected"]) {
                                selected.push(_.where($scope.allSelectables, {uri: children[i]["uri"]})[0]);
                            }
                        }
                        $scope.selectedData = selected;
                    };

                    self.populate = $scope.populate = function(item) {
                        $scope.allSelectables.push(item);
                    };

                    self.deselectAll = $scope.deselectAll = function(except) {
                        except = !Array.isArray(except)? [except] : except;
                        var children = $scope.allSelectables;
                        $scope.selectedData = [];
                        for(var i = 0; i < children.length; i++) {
                            if(typeof except != 'undefined' && except.indexOf(children[i]["uri"])!== -1) {
                                _.where($scope.allSelectables, {uri: except[except.indexOf(children[i]["uri"])]})[0]["selected"] = true;
                                $scope.selectedData.push(_.where($scope.allSelectables, {uri: except[except.indexOf(children[i]["uri"])]})[0]);
                                continue;
                            }
                            _.where($scope.allSelectables, {uri: children[i]["uri"]})[0]["selecting"] = false;
                            _.where($scope.allSelectables, {uri: children[i]["uri"]})[0]["selected"] = false;
                        }
                    };

                    self.selectAll = $scope.selectAll = function() {
                        var children = $scope.allSelectables;
                        var selected = [];
                        if(children.length) {
                            for(var i = 0; i < children.length; i++) {
                                _.where($scope.allSelectables, {uri: children[i]["uri"]})[0]["selecting"] = false;
                                _.where($scope.allSelectables, {uri: children[i]["uri"]})[0]["selected"] = true;
                                selected.push(_.where($scope.allSelectables, {uri: children[i]["uri"]})[0]);
                            }

                            $scope.selectedData = selected;
                        }
                    };

                    self.isElemVisible = $scope.isElemVisible = function(elem) {
                        var isVisible = true;
                        if(elem.prop('offsetWidth') <= 0 ||
                            elem.prop('offsetHeight') <= 0 ||
                            (offset(elem[0]).left + elem.prop('offsetWidth')) < 0 ||
                            (offset(elem[0]).top + elem.prop('offsetHeight')) < 0 || !elem.is(':visible') ||
                            parseFloat(elem.css('opacity')) <= 0 ||
                            elem.css('display') === 'none') {
                            isVisible = false;
                        }
                        return isVisible;
                    };

                    self.remove = $scope.remove = function(item) {
                        $scope.allSelectables = _.reject($scope.allSelectables, {uri: item.uri});
                    };

                    self.onLinkEvtTrigger = $scope.onLinkEvtTrigger = function(event) {
                    }
                }
            },
            link: function(scope, element, attrs, ctrl) {
                if(scope.multipleSelectionZone === 'false' || scope.multipleSelectionZone === false) {
                } else {
                    activateLink();
                }

                function activateLink() {
                    scope.isSelectableZone = true;
                    scope.selectionZoneOffset = offset(element[0]);
                    if(typeof attrs["continuousSelection"] !== 'undefined') {
                        ctrl.continuousSelection = scope.continuousSelection = true;
                    }

                    if(attrs["selectingClass"] && typeof attrs["selectingClass"] === 'string') {
                        ctrl.selectingClass = scope.selectingClass = attrs["selectingClass"];
                    }

                    if(attrs["selectedClass"] && typeof attrs["selectedClass"] === 'string') {
                        ctrl.selectedClass = scope.selectedClass = attrs["selectedClass"];
                    }

                    if(typeof attrs["enableItemDragSelection"] !== 'undefined') {
                        ctrl.enableItemDragSelection = scope.enableItemDragSelection = true;
                    }

                    var startX = 0,
                        startY = 0;
                    var helper;

                    scope.$watch(function() {
                        return scope.selectedData.length;
                    }, function() {
                        _.each(scope.allSelectables, function(selData) {
                            var selObj = _.where(scope.selectedData, {uri: selData.uri});
                            selData.selected = selObj && selObj.length;
                        });

                        $timeout(function() {
                            scope.$emit("MULTISEL_UPDATED", scope.selectedData);
                        });
                    });

                    scope.$on('MULTISEL_SELECT_ALL', scope.selectAll);
                    scope.$on('MULTISEL_SELECT_NONE', scope.deselectAll);
                    scope.$on('MULTISEL_UPDATE', function(evt, itemId) {
                        scope.deselectAll(itemId);
                    });
                    scope.$on('MULTISEL_RESET_CLICKSTATE', function() {
                        ctrl.childItemClicked = false;
                    });


                    /**
                     * Check that 2 boxes hitting
                     * @param  {Object} box1
                     * @param  {Object} box2
                     * @return {Boolean} is hitting
                     */
                    function checkElementHitting(box1, box2) {
                        return (box2.beginX <= box1.beginX && box1.beginX <= box2.endX || box1.beginX <= box2.beginX && box2.beginX <= box1.endX) &&
                        (box2.beginY <= box1.beginY && box1.beginY <= box2.endY || box1.beginY <= box2.beginY && box2.beginY <= box1.endY);
                    }

                    /**
                     * Transform box to object to:
                     *  beginX is always be less then endX
                     *  beginY is always be less then endY
                     * @param  {Number} startX
                     * @param  {Number} startY
                     * @param  {Number} endX
                     * @param  {Number} endY
                     * @return {Object} result Transformed object
                     */
                    function transformBox(startX, startY, endX, endY) {

                        var result = {};

                        if(startX > endX) {
                            result.beginX = endX;
                            result.endX = startX;
                        } else {
                            result.beginX = startX;
                            result.endX = endX;
                        }
                        if(startY > endY) {
                            result.beginY = endY;
                            result.endY = startY;
                        } else {
                            result.beginY = startY;
                            result.endY = endY;
                        }
                        return result;
                    }

                    /**
                     * Method move selection helper
                     * @param  {Element} hepler
                     * @param  {Number} startX
                     * @param  {Number} startY
                     * @param  {Number} endX
                     * @param  {Number} endY
                     */
                    function moveSelectionHelper(hepler, startX, startY, endX, endY) {

                        var box = transformBox(startX, startY, endX, endY);

                        helper.css({
                            "top": box.beginY + "px",
                            "left": box.beginX + "px",
                            "width": (box.endX - box.beginX) + "px",
                            "height": (box.endY - box.beginY) + "px"
                        });
                    }

                    /**
                     * Method on Mouse Move
                     * @param  {Event} @event
                     */
                    function mousemove(event) {

                        var boundX = event.pageX;
                        boundX = (boundX < offset(element[0]).left) ? offset(element[0]).left : boundX;
                        boundX = (boundX > offset(element[0]).left + element.prop('offsetWidth')) ? (offset(element[0]).left + element.prop('offsetWidth')) : boundX;

                        var boundY = event.pageY;
                        boundY = (boundY < offset(element[0]).top) ? offset(element[0]).top : boundY;
                        boundY = (boundY > offset(element[0]).top + element.prop('offsetHeight')) ? (offset(element[0]).top + element.prop('offsetHeight')) : boundY;
                        // Prevent default dragging of selected content
                        //event.preventDefault();
                        // Move helper
                        moveSelectionHelper(helper, startX, startY, boundX, boundY);


                        function hitsAnyElement(childElements) {
                            var hitting = 0;
                            _.each(childElements, function(childElem) {
                                if(scope.isElemVisible(childElem) && checkElementHitting(
                                        transformBox(
                                            offset(childElem[0]).left,
                                            offset(childElem[0]).top,
                                            offset(childElem[0]).left + childElem.prop('offsetWidth'),
                                            offset(childElem[0]).top + childElem.prop('offsetHeight')
                                        ),
                                        transformBox(startX, startY, boundX, boundY)
                                    )) {
                                    hitting++;
                                }
                            });
                            return hitting > 0;
                        }


                        // Check items is selecting
                        //var children = getSelectableElements(element);
                        var children = scope.allSelectables;
                        for(var i = 0; i < children.length; i++) {
                            var childData = _.where(scope.allSelectables, {uri: children[i]["uri"]});

                            if(hitsAnyElement(children[i].element)) {
                                _.where(scope.allSelectables, {uri: children[i]["uri"]})[0]["selecting"] = true;
                            } else {
                                _.where(scope.allSelectables, {uri: children[i]["uri"]})[0]["selected"] = false;
                                _.where(scope.allSelectables, {uri: children[i]["uri"]})[0]["selecting"] = false;
                            }
                        }

                    }


                    /**
                     * Event on Mouse up
                     * @param  {Event} event
                     */
                    function mouseup(event) {
                        // Prevent default dragging of selected content
                        event.preventDefault();
                        // Remove helper
                        helper.remove();
                        // Change all selecting items to selected
                        //var children = getSelectableElements(element);
                        var children = scope.allSelectables;

                        for(var i = 0; i < children.length; i++) {
                            var childData = _.where(scope.allSelectables, {uri: children[i]["uri"]});
                            if(_.where(scope.allSelectables, {uri: children[i]["uri"]})[0]["selecting"] === true) {
                                _.where(scope.allSelectables, {uri: children[i]["uri"]})[0]["selecting"] = false;

                                _.where(scope.allSelectables, {uri: children[i]["uri"]})[0]["selected"] = event.ctrlKey ? !childData["selected"] : true;

                                scope.updateSelectedData(_.where(scope.allSelectables, {uri: children[i]["uri"]})[0]);
                            } else {
                                /*if (!scope.msService.continuousSelection && checkElementHitting(transformBox(children[i].prop('offsetLeft'), children[i].prop('offsetTop'), children[i].prop('offsetLeft') + children[i].prop('offsetWidth'), children[i].prop('offsetTop') + children[i].prop('offsetHeight')), transformBox(event.pageX, event.pageY, event.pageX, event.pageY))) {
                                 if (children[i].scope().isSelected === false) {
                                 children[i].scope().isSelected = true;
                                 children[i].scope().$apply();
                                 }
                                 }*/
                            }
                            ctrl.isDragSelection = false;
                        }

                        if(ctrl.childItemClicked) {
                            ctrl.childItemClicked = false;
                        }

                        // Remove listeners
                        $document.off('mousemove.multi-select', mousemove);
                        $document.off('mouseup.multi-select', mouseup);
                    }

                    element.on('mousedown.multi-select', function(event) {
                        // Prevent default dragging of selected content
                        event.preventDefault();
                        ctrl.isDragSelection = true;

                        // Deslect all the selected items
                        if((!scope.enableItemDragSelection && !event.ctrlKey) || (scope.enableItemDragSelection && !ctrl.childItemClicked && !event.ctrlKey)) {
                            scope.deselectAll();
                        }

                        // Update start coordinates
                        startX = event.pageX;
                        startY = event.pageY;

                        // Create helper
                        helper = angular.element(".select-helper");
                        if(!helper.length) {
                            helper = angular
                                .element("<div></div>")
                                .addClass('select-helper');
                        }

                        $document.find('body').eq(0).append(helper);

                        // Attach events
                        $document.on('mousemove.multi-select', mousemove);
                        $document.on('mouseup.multi-select', mouseup);
                    });


                    scope.$on("$destroy", function() {
                        $document.off('mousemove.multi-select', mousemove);
                        $document.off('mouseup.multi-select', mouseup);
                    });
                }
            }
        };
    }]);