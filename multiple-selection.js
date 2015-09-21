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
        var selectionZoneCtrl = ctrls[0];
        var ngModelCtrl = ctrls[1];
        if(selectionZoneCtrl.multipleSelectionZone === false || selectionZoneCtrl.multipleSelectionZone === 'false'){
        }else{
          activateItemLink();
        }

        function activateItemLink(){
          scope.linkTriggered = false;
          scope.itemData = {};
          var initClickPosition = {}, finalClickPosition = {};

          if(ngModelCtrl){
            ngModelCtrl.$render = function(){
              ngModelCtrl["selectable"] = true;
              scope.itemData = ngModelCtrl.$modelValue;
              if(!scope.itemData.element){
                scope.itemData.element = [];
              }
              scope.itemData['id'] =  scope.itemData['id'] ? scope.itemData['id']: selectionZoneCtrl.getAllSelectables().length;
              scope.itemData.element.push(element);
              selectionZoneCtrl.populate(scope.itemData);
            };
          }else{
            scope.itemData['id'] = selectionZoneCtrl.getAllSelectables().length;
            scope.itemData.element.push(element);
            selectionZoneCtrl.populate(scope.itemData);
          }


          scope.$watchGroup([function () {
            return ngModelCtrl.$modelValue["selecting"];
          }, function (){
            return ngModelCtrl.$modelValue["selected"];
          }], function(vals) {
            scope.selecting = selectionZoneCtrl.selectingClass;
            scope.selected = selectionZoneCtrl.selectedClass;

            if(selectionZoneCtrl.selectingClass){
              if(vals[0]){
                element.addClass(selectionZoneCtrl.selectingClass);
              }else{
                element.removeClass(selectionZoneCtrl.selectingClass);
              }
            }

            if(selectionZoneCtrl.selectedClass){
              if(vals[1]){
                element.addClass(selectionZoneCtrl.selectedClass);
              }else{
                element.removeClass(selectionZoneCtrl.selectedClass);
              }
            }
          });


          element.on('mousedown.multi-select', function(event, optEvtData) {
            initClickPosition = {
              x: event.clientX,
              y: event.clientY
            };

            if(optEvtData && typeof optEvtData ==='object'){
              initClickPosition = {
                x: optEvtData.clientX,
                y: optEvtData.clientY
              };
            }

            selectionZoneCtrl.childItemClicked = scope.mouseDown = true;
            if(!selectionZoneCtrl.enableItemDragSelection || ngModelCtrl.$modelValue["selected"]){
              event.preventDefault();
              event.stopPropagation();
            }
          });

          element.on('mouseup.multi-select touchend.multi-select', function(event, optEvtData) {
            finalClickPosition = {
              x: event.clientX,
              y: event.clientY
            };

            if(optEvtData && typeof optEvtData ==='object'){
              finalClickPosition = {
                x: optEvtData.clientX,
                y: optEvtData.clientY
              };
              event.which = optEvtData.which;
            }

            if(scope.linkTriggered){
              scope.linkTriggered = false;
              return false;
            }
            if (event.which == 1) {
              if (!selectionZoneCtrl.continuousSelection) {
                if (ngModelCtrl.$modelValue["selected"]) {
                  if(!event.ctrlKey){
                    selectionZoneCtrl.deselectAll(scope.itemData['id']);
                  }else{
                    ngModelCtrl.$modelValue["selected"] = false;
                  }
                } else {
                  if (!event.ctrlKey && !selectionZoneCtrl.isDragSelection) {
                    selectionZoneCtrl.deselectAll(scope.itemData['id']);
                  }
                  ngModelCtrl.$modelValue["selected"] = true;
                }
              } else {
                if(initClickPosition.x === finalClickPosition.x || initClickPosition.y === finalClickPosition.y){
                  ngModelCtrl.$modelValue["selected"] = !ngModelCtrl.$modelValue["selected"];
                }
              }

              scope.mouseDown = selectionZoneCtrl.childItemClicked = selectionZoneCtrl.isDragSelection = false;
              scope.linkTriggered = false;
              selectionZoneCtrl.updateSelectedData(ngModelCtrl.$modelValue);
            }

            //event.stopImmediatePropagation();
          });

          element.on('click mousedown mouseup touchstart touchend', 'a', function(event) {
            if(event.type === 'mousedown'){
              if(selectionZoneCtrl.enableItemDragSelection){
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

            //selectionZoneCtrl.onLinkEvtTrigger(event);
            //event.stopPropagation();
          });

          scope.$watch(function(){
            return scope.itemData['isSelecting'];
          }, function(val){
            if(selectionZoneCtrl.selectingClass){
              if(val){
                element.addClass(selectionZoneCtrl.selectingClass);
              }else {
                element.removeClass(selectionZoneCtrl.selectingClass);
              }
            }
          });

          scope.$watch(function(){
            return scope.itemData['isSelected'];
          }, function(val){
            if(selectionZoneCtrl.selectedClass){
              if(val){
                element.addClass(selectionZoneCtrl.selectedClass);
              }else {
                element.removeClass(selectionZoneCtrl.selectedClass);
              }
            }
          });
        }
      }
    };
  }])
  .directive('multipleSelectionZone', ['$document', '$timeout', '$parse', function($document, $timeout, $parse) {
    return {
      restrict: 'A',
      scope: {
        selectionData: "=?",
        selectedData: "=?",
        multipleSelectionZone: "@"
      },
      controller: function($scope) {
        this.multipleSelectionZone = $scope.multipleSelectionZone;
        var self = this;

        if($scope.multipleSelectionZone === 'false' || $scope.multipleSelectionZone === false){
          console.log("Multi-selection-zone disabled!");
        }else{
          activateController();
        }

        function activateController(){
          $scope.allSelectables = [];
          self.selectingClass = $scope.selectingClass = "";
          self.selectedClass = $scope.selectedClass = "";
          // this variable enables continuous selection of the items without pressing 'ctrl' key
          self.continuousSelection = $scope.continuousSelection = false;
          // this variable enables drag selection of the items via directly dragging over an item which is by default disabled
          self.enableItemDragSelection = $scope.enableItemDragSelection = false;
          self.isDragSelection = false;
          self.childItemClicked = false;

          self.selectItem = $scope.selectItem = function (itemId){
            _.where($scope.selectionData, {id: itemId})[0]["selected"] = false;
          };

          self.getAllSelectables = $scope.getAllSelectables = function(){
            return $scope.allSelectables;
          };

          self.getSelectedData = $scope.getSelectedData = function(){
            return $scope.selectedData;
          };

          self.setSelectedData = $scope.setSelectedData = function (selData){
            selData = typeof selData === 'undefined' ? [] : selData;
            $scope.selectedData = selData;
          };

          self.updateSelectedData = $scope.updateSelectedData = function(item){
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

          self.setAllSelected = $scope.setAllSelected = function(){
            var selected = [];
            var children = $scope.allSelectables;
            for (var i = 0; i < children.length; i++) {
              if(_.where($scope.selectionData, {id: children[i]["id"]})[0]["selected"]){
                selected.push(_.where($scope.selectionData, {id: children[i]["id"]})[0]);
              }
            }
            $scope.selectedData = selected;
          };

          self.populate = $scope.populate = function(item){
            $scope.allSelectables.push(item);
          };

          self.deselectAll = $scope.deselectAll = function(exceptOjbId){
            var children = $scope.allSelectables;
            $scope.selectedData = [];
            for (var i = 0; i < children.length; i++) {
              if(typeof exceptOjbId != 'undefined' && children[i]["id"] == exceptOjbId){
                _.where($scope.selectionData, {id: exceptOjbId})[0]["selected"] = true;
                $scope.selectedData.push(_.where($scope.selectionData, {id: exceptOjbId})[0]);
                continue;
              }
              _.where($scope.selectionData, {id: children[i]["id"]})[0]["selecting"] = false;
              _.where($scope.selectionData, {id: children[i]["id"]})[0]["selected"] = false;
            }
          };

          self.selectAll = $scope.selectAll = function(){
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

          self.onLinkEvtTrigger = $scope.onLinkEvtTrigger = function(event) {
          }
        }
      },
      link: function(scope, element, attrs, ctrl) {
        if(scope.multipleSelectionZone === 'false' || scope.multipleSelectionZone === false){
        }else{
          activateLink();
        }

        function activateLink(){
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
          scope.$on('MULTISEL_UPDATE', function(evt, itemId){
            scope.deselectAll(itemId);
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
      }
    };
  }]);