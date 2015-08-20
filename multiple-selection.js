/**
 * Angular JS multiple-selection module
 * @author Maksym Pomazan
 * @version 0.0.3
 */
/*function getSelectableElements(element) {
 var out = [];
 var children = element.children();
 for (var i = 0; i < children.length; i++) {
 var child = angular.element(children[i]);
 if (child.scope().isSelectable) {
 out.push(child);
 } else {
 if (child.scope().$id != element.scope().$id && child.scope().isSelectableZone === true) {

 } else {
 out = out.concat(getSelectableElements(child));
 }
 }
 }
 return out;
 }*/

function offset(element) {
  var documentElem,
    box = {
      top: 0,
      left: 0
    },
    doc = element && element.ownerDocument;
  documentElem = doc.documentElement;

  if (typeof element.getBoundingClientRect !== undefined) {
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
      require: ["^multipleSelectionZone", "ngModel"],
      controller: function($scope) {
      },
      link: function(scope, element, attrs, ctrls) {
        // Default Item Data

        scope.linkTriggered = false;
        scope.itemData = {};

        /*element.on("contextmenu", function(e) {)
         e.preventDefault();
         return false;
         });*/

        if(ctrls[1]){
          ctrls[1].$render = function(){
            ctrls[1]["selectable"] = true;
            scope.itemData = ctrls[1].$modelValue;
            if(!scope.itemData.element){
              scope.itemData.element = [];
            }
            scope.itemData['id'] =  scope.itemData['id'] ? scope.itemData['id']: ctrls[0].getAllSelectables().length;
            scope.itemData.element.push(element);
            ctrls[0].populate(scope.itemData);
          };
        }else{
          scope.itemData['id'] = ctrls[0].getAllSelectables().length;
          scope.itemData.element.push(element);
          ctrls[0].populate(scope.itemData);
        }


        scope.$watchGroup([function () {
          return ctrls[1].$modelValue["selecting"];
        }, function (){
          return ctrls[1].$modelValue["selected"];
        }], function(vals) {
          scope.selecting = ctrls[0].selectingClass;
          scope.selected = ctrls[0].selectedClass;

          if(ctrls[0].selectingClass){
            if(vals[0]){
              element.addClass(ctrls[0].selectingClass);
            }else{
              element.removeClass(ctrls[0].selectingClass);
            }
          }

          if(ctrls[0].selectedClass){
            if(vals[1]){
              element.addClass(ctrls[0].selectedClass);
            }else{
              element.removeClass(ctrls[0].selectedClass);
            }
          }
        });


        element.on('mousedown.multi-select', function(event) {
          scope.mouseDown = true;
          //ctrls[0].deselectAll();
          if(!ctrls[0].enableItemDragSelection || ctrls[1].$modelValue["selected"]){
            event.preventDefault();
            event.stopPropagation();
          }
        });

        element.on('mouseup.multi-select touchend', function(event) {
          //console.log("model", ctrls[1].$modelValue);
          if(scope.linkTriggered){
            scope.linkTriggered = false;
            return false;
          }
          if (event.which == 1) {
            if (!ctrls[0].continuousSelection) {
              if (ctrls[1].$modelValue["selected"]) {
                if (event.ctrlKey) {
                  ctrls[1].$modelValue["selected"] = false;
                }
              } else {
                if (!event.ctrlKey) {
                  ctrls[0].deselectAll();
                }
                ctrls[1].$modelValue["selected"] = true;
              }
            } else {
              if(scope.mouseDown && ctrls[1].$modelValue["selected"]){
                ctrls[0].deselectAll(scope.itemData['id']);
                return;
              }
              ctrls[1].$modelValue["selected"] = !ctrls[1].$modelValue["selected"];
            }
            scope.mouseDown = false;
            scope.linkTriggered = false;
          }
          //event.stopImmediatePropagation();
        });

        element.on('click mousedown mouseup touchstart touchend', 'a', function(event) {
          if(event.type === 'mousedown' || event.type === 'touchstart'){
            if(ctrls[0].enableItemDragSelection){
              event.stopPropagation();
            }

            scope.linkTriggered = true;
            $timeout(function(){
              scope.linkTriggered = false;
            }, 500);
          }
          if(event.type === 'mouseup' || event.type === 'touchend'){
            $timeout(function(){
              scope.linkTriggered = false;
            }, 10);
          }

          ctrls[0].onLinkEvtTrigger(event);
          //event.stopPropagation();
        });

        scope.$watch(function(){
          return scope.itemData['isSelecting'];
        }, function(val){
          if(ctrls[0].selectingClass){
            if(val){
              element.addClass(ctrls[0].selectingClass);
            }else {
              element.removeClass(ctrls[0].selectingClass);
            }
          }
        });

        scope.$watch(function(){
          return scope.itemData['isSelected'];
        }, function(val){
          if(ctrls[0].selectedClass){
            if(val){
              element.addClass(ctrls[0].selectedClass);
            }else {
              element.removeClass(ctrls[0].selectedClass);
            }
          }
        });
      }
    };
  }])
  .directive('multipleSelectionZone', ['$document', '$timeout', function($document, $timeout) {
    return {
      restrict: 'A',
      scope: {
        selectionData: "=?"
      },
      controller: function($scope) {
        $scope.allSelectables = [];
        this.selectingClass = $scope.selectingClass = "";
        this.selectedClass = $scope.selectedClass = "";
        this.continuousSelection = $scope.continuousSelection = false;
        this.enableItemDragSelection = $scope.enableItemDragSelection = false;

        this.getAllSelectables = function(){
          return $scope.allSelectables;
        }

        this.populate = function(item){
          $scope.allSelectables.push(item);
        };

        this.deselectAll = function(exceptOjbId){
          var children = $scope.allSelectables;
          for (var i = 0; i < children.length; i++) {
            if(exceptOjbId && children[i]["id"] == exceptOjbId){
              continue;
            }
            _.where($scope.selectionData, {id: children[i]["id"]})[0]["selecting"] = false;
            _.where($scope.selectionData, {id: children[i]["id"]})[0]["selected"] = false;
          }
        };

        this.onLinkEvtTrigger = $scope.onLinkEvtTrigger = function(event) {
        }
      },
      link: function(scope, element, attrs, ctrl) {
        scope.isSelectableZone = true;
        if (typeof attrs["continuousSelection"] !== 'undefined') {
          ctrl.continuousSelection = scope.continuousSelection = true;
        }

        if (attrs["selectingClass"] && typeof attrs["selectingClass"] === 'string') {
          ctrl.selectingClass = scope.selectingClass = attrs["selectingClass"];
        }

        if (attrs["selectedClass"] && typeof attrs["selectedClass"] === 'string') {
          ctrl.selectedClass = scope.selectedClass = attrs["selectedClass"];
        }

        if (typeof attrs["enableItemDragSelection"]!== 'undefined') {
          ctrl.enableItemDragSelection = scope.enableItemDragSelection = true;
        }

        var startX = 0,
          startY = 0;
        var helper;

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

          if (startX > endX) {
            result.beginX = endX;
            result.endX = startX;
          } else {
            result.beginX = startX;
            result.endX = endX;
          }
          if (startY > endY) {
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
          //console.log(element);
          // Prevent default dragging of selected content
          //event.preventDefault();
          // Move helper
          moveSelectionHelper(helper, startX, startY, event.pageX, event.pageY);


          function hitsAnyElement(childElements){
            var hitting = 0;
            _.each(childElements,function(childElem){
              if(checkElementHitting(
                transformBox(
                  offset(childElem[0]).left,
                  offset(childElem[0]).top,
                  offset(childElem[0]).left + childElem.prop('offsetWidth'),
                  offset(childElem[0]).top + childElem.prop('offsetHeight')
                ),
                transformBox(startX, startY, event.pageX, event.pageY)
              )){
                hitting++;
              }
            });
            return hitting > 0;
          }


          // Check items is selecting
          //var children = getSelectableElements(element);
          var children = scope.allSelectables;
          for (var i = 0; i < children.length; i++) {
            var childData = _.where(scope.selectionData,{id: children[i]["id"]});


            if (hitsAnyElement(children[i].element)) {
              _.where(scope.selectionData, {id: children[i]["id"]})[0]["selecting"] = true;
            } else {
              _.where(scope.selectionData, {id: children[i]["id"]})[0]["selected"] = false;
              _.where(scope.selectionData, {id: children[i]["id"]})[0]["selecting"] = false;
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

          for (var i = 0; i < children.length; i++) {
            //var childData = _.where(scope.selectionData,{id: children[i]["id"]});
            if (_.where(scope.selectionData,{id: children[i]["id"]})[0]["selecting"] === true) {
              _.where(scope.selectionData,{id: children[i]["id"]})[0]["selecting"] = false;

              _.where(scope.selectionData,{id: children[i]["id"]})[0]["selected"] = event.ctrlKey ? !childData["selected"] : true;
            } else {
              /*if (!scope.msService.continuousSelection && checkElementHitting(transformBox(children[i].prop('offsetLeft'), children[i].prop('offsetTop'), children[i].prop('offsetLeft') + children[i].prop('offsetWidth'), children[i].prop('offsetTop') + children[i].prop('offsetHeight')), transformBox(event.pageX, event.pageY, event.pageX, event.pageY))) {
               if (children[i].scope().isSelected === false) {
               children[i].scope().isSelected = true;
               children[i].scope().$apply();
               }
               }*/
            }
          }

          // Remove listeners
          $document.off('mousemove.multi-select', mousemove);
          $document.off('mouseup.multi-select', mouseup);
        }

        element.on('mousedown.multi-select', function(event) {
          //console.log(jQuery(event.target).closest('.entity-tile'));
          // Prevent default dragging of selected content
          event.preventDefault();
          if (!event.ctrlKey) {
            // Skip all selected or selecting items
            //var children = getSelectableElements(element);
            var children = scope.allSelectables;
            for (var i = 0; i < children.length; i++) {
              var childData = _.where(scope.selectionData,{id: children[i]["id"]});

              if (childData[0]["selecting"] === true || childData[0]["selected"] === true) {
                _.where(scope.selectionData,{id: children[i]["id"]})[0]["selecting"] = false;
                _.where(scope.selectionData,{id: children[i]["id"]})[0]["selected"] = false;
              }
            }
          }
          // Update start coordinates
          startX = event.pageX;
          startY = event.pageY;

          // Create helper
          helper = angular.element(".select-helper");
          if(!helper.length){
            helper = angular
              .element("<div></div>")
              .addClass('select-helper');
          }

          $document.find('body').eq(0).append(helper);

          // Attach events
          $document.on('mousemove.multi-select', mousemove);
          $document.on('mouseup.multi-select', mouseup);
        });

        /*scope.$on("innerLinkTriggered", function(){
          $document.trigger('mouseup.multi-select');
        });*/

        scope.$on("$destroy", function(){
          $document.off('mousemove.multi-select', mousemove);
          $document.off('mouseup.multi-select', mouseup);
          //scope.msService.reset();
          //console.log('destroy multi select');
        });
      }
    };
  }]);