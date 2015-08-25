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
          ctrls[0].childItemClicked = scope.mouseDown = true;
          if(!ctrls[0].enableItemDragSelection || ctrls[1].$modelValue["selected"]){
            event.preventDefault();
            event.stopPropagation();
          }
        });

        element.on('mouseup.multi-select touchend.multi-select', function(event) {
          if(scope.linkTriggered){
            scope.linkTriggered = false;
            return false;
          }
          if (event.which == 1) {
            if (!ctrls[0].continuousSelection) {
              if (ctrls[1].$modelValue["selected"]) {
                if(!event.ctrlKey){
                  ctrls[0].deselectAll(scope.itemData['id']);
                }else{
                  ctrls[1].$modelValue["selected"] = false;
                }
              } else {
                if (!event.ctrlKey && !ctrls[0].isDragSelection) {
                  ctrls[0].deselectAll(scope.itemData['id']);
                }
                ctrls[1].$modelValue["selected"] = true;
              }
            } else {
              //if(!event.ctrlKey && scope.mouseDown && ctrls[1].$modelValue["selected"] && ctrls[0].getSelectedData().length > 1)
              ctrls[1].$modelValue["selected"] = !ctrls[1].$modelValue["selected"];
            }

            scope.mouseDown = ctrls[0].childItemClicked = ctrls[0].isDragSelection = false;
            scope.linkTriggered = false;
            ctrls[0].updateSelectedData(ctrls[1].$modelValue);
          }

          //event.stopImmediatePropagation();
        });

        element.on('click mousedown mouseup touchstart touchend', 'a', function(event) {
          if(event.type === 'mousedown'){
            if(ctrls[0].enableItemDragSelection){
              event.stopPropagation();
            }

            scope.linkTriggered = true;
             $timeout(function(){
              scope.linkTriggered = false;
            }, 500);
          }
          if(event.type === 'mouseup'){
            $timeout(function(){
              scope.linkTriggered = false;
            }, 10);
          }

          //ctrls[0].onLinkEvtTrigger(event);
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
        selectionData: "=?",
        selectedData: "=?"
      },
      controller: function($scope) {
        $scope.allSelectables = [];
        this.selectingClass = $scope.selectingClass = "";
        this.selectedClass = $scope.selectedClass = "";
        // this variable enables continuous selection of the items without pressing 'ctrl' key
        this.continuousSelection = $scope.continuousSelection = false;
        // this variable enables drag selection of the items via directly dragging over an item which is by default disabled
        this.enableItemDragSelection = $scope.enableItemDragSelection = false;
        this.isDragSelection = false;
        this.childItemClicked = false;

        this.getAllSelectables = $scope.getAllSelectables = function(){
          return $scope.allSelectables;
        };

        this.getSelectedData = $scope.getSelectedData = function(){
          return $scope.selectedData;
        };

        this.setSelectedData = $scope.setSelectedData = function (selData){
          selData = typeof selData === 'undefined' ? [] : selData;
          $scope.selectedData = selData;
        };

        this.updateSelectedData = $scope.updateSelectedData = function(item){
          var exist = false;
          var index = null;
          var selData = $scope.selectedData;
          for(var i = 0; i < selData.length; i++){
            if(selData[i].id == item.id){
              index = i;
              exist = true;
              break;
            }
          }
          if(item.selected && !exist){
            selData.push(item);
          }else if(!item.selected && exist){
            selData.splice(index,1);
          }

          $scope.selectedData = selData;
        };

        this.setAllSelected = $scope.setAllSelected = function(){
          var selected = [];
          var children = $scope.allSelectables;
          for (var i = 0; i < children.length; i++) {
            if(_.where($scope.selectionData, {id: children[i]["id"]})[0]["selected"]){
              selected.push(_.where($scope.selectionData, {id: children[i]["id"]})[0]);
            }
          }
          $scope.selectedData = selected;
        };

        this.populate = $scope.populate = function(item){
          $scope.allSelectables.push(item);
        };

        this.deselectAll = $scope.deselectAll = function(exceptOjbId){
          var children = $scope.allSelectables;
          $scope.selectedData = [];
          for (var i = 0; i < children.length; i++) {
            if(typeof exceptOjbId != 'undefined' && children[i]["id"] == exceptOjbId){
              $scope.selectedData.push(_.where($scope.selectionData, {id: children[i]["id"]})[0]);
              continue;
            }
            _.where($scope.selectionData, {id: children[i]["id"]})[0]["selecting"] = false;
            _.where($scope.selectionData, {id: children[i]["id"]})[0]["selected"] = false;
          }
        };

        this.selectAll = $scope.selectAll = function(){
          var children = $scope.allSelectables;
          var selected = [];
          if(children.length){
            for (var i = 0; i < children.length; i++) {
              _.where($scope.selectionData, {id: children[i]["id"]})[0]["selecting"] = false;
              _.where($scope.selectionData, {id: children[i]["id"]})[0]["selected"] = true;
              selected.push(_.where($scope.selectionData, {id: children[i]["id"]})[0]);
            }

            $scope.selectedData = selected;
          }
        };

        this.onLinkEvtTrigger = $scope.onLinkEvtTrigger = function(event) {
        }
      },
      link: function(scope, element, attrs, ctrl) {
        scope.isSelectableZone = true;
        scope.selectionZoneOffset = offset(element[0]);
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

        scope.$on('MULTISEL_SELECT_ALL', scope.selectAll);
        scope.$on('MULTISEL_SELECT_NONE', scope.deselectAll);


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
                transformBox(startX, startY, boundX, boundY)
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
            var childData = _.where(scope.selectionData,{id: children[i]["id"]});
            if (_.where(scope.selectionData,{id: children[i]["id"]})[0]["selecting"] === true) {
              _.where(scope.selectionData,{id: children[i]["id"]})[0]["selecting"] = false;

              _.where(scope.selectionData,{id: children[i]["id"]})[0]["selected"] = event.ctrlKey ? !childData["selected"] : true;

              scope.updateSelectedData(_.where(scope.selectionData,{id: children[i]["id"]})[0]);
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

          // Remove listeners
          $document.off('mousemove.multi-select', mousemove);
          $document.off('mouseup.multi-select', mouseup);
        }

        element.on('mousedown.multi-select', function(event) {
          // Prevent default dragging of selected content
          event.preventDefault();
          ctrl.isDragSelection = true;

          // Deslect all the selected items
          if((!scope.enableItemDragSelection && !event.ctrlKey) || (scope.enableItemDragSelection && !ctrl.childItemClicked && !event.ctrlKey)){
            scope.deselectAll();
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


        scope.$on("$destroy", function(){
          $document.off('mousemove.multi-select', mousemove);
          $document.off('mouseup.multi-select', mouseup);
        });
      }
    };
  }]);