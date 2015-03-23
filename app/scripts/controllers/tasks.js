(function(){
  'use strict';

angular.module('simCityWebApp')
  .controller('TaskListCtrl', TaskListController)
  .controller('RemoveTaskModalInstanceCtrl', RemoveTaskModalInstanceController);

TaskListController.$inject = ['MessageBus', 'LayerService', 'SimCityWebService', '$modal', '$interval'];
function TaskListController(MessageBus, LayerService, WebService, $modal, $interval) {
  var vm = this;

  vm.tasks = [];
  vm.updateView = updateView;
  vm.visualize = visualize;
  vm.remove = modalRemove;

  updateView();
  MessageBus.subscribe('task.submitted', updateView);
  $interval(updateView, 10000);

  var styleByVolume = {
    0: [new ol.style.Style({
          stroke: new ol.style.Stroke({
            color: 'yellow',
            width: 1,
          })
        })],
    12: [new ol.style.Style({
          stroke: new ol.style.Stroke({
            color: 'orange',
            width: 1,
          })
        })],
    25: [new ol.style.Style({
          stroke: new ol.style.Stroke({
            color: 'red',
            width: 2,
          })
        })],
  };
  // reverse sort
  var sortedStyleByVolumeKeys = Object.keys(styleByVolume).sort(function(a,b){return b-a;});

  function visualize(task) {
    var layer = {
      name: task.id + '_volume',
      title: task.input.name + ' link volume',
      source: {
        type: 'GeoJSON',
        url: task.url + '/GeoLinkVolume.8.json', //'/output/blr/GeoLinkVolume.8.json',
      },
      style: function(feature) {
        var volume = feature.getProperties().volume;
        for (var i = 0; i < sortedStyleByVolumeKeys.length; i++) {
          if (volume >= sortedStyleByVolumeKeys[i]) {
            return styleByVolume[sortedStyleByVolumeKeys[i]];
          }
        }
      },
    };
    LayerService.addLayer(layer);
    LayerService.activateLayer(layer);
  }

  function updateView() {
    WebService.viewTasks('matsim', '0.3')
      .success(function(data) {
        vm.tasks = data.rows.map(function(el) { return el.value; });
      })
      .error(function(data, status) { console.log('cannot find simulations ' + status + '; ' + data); });
  }

  function modalRemove(task) {
    $modal.open({
      templateUrl: 'removeSimulationModal.html',
      controller: 'RemoveTaskModalInstanceCtrl',
      resolve: {
        toRemove: function() {
          return task;
        },
      },
    }).result.then(updateView);
  }
}

RemoveTaskModalInstanceController.$inject = ['$scope', '$modalInstance', 'SimCityWebService', 'toRemove'];
function RemoveTaskModalInstanceController($scope, $modalInstance, WebService, toRemove) {
  $scope.cancel = $modalInstance.dismiss;
  $scope.remove = function () {
    WebService.deleteTask(toRemove.id, toRemove.rev)
      .success($modalInstance.close)
      .error(function (data, status) {
        if (status === 409) {
          $scope.removeError = 'cannot remove simulation: it was modified';
        } else if (data) {
          $scope.removeError = 'cannot remove simulation: ' + data;
        } else {
          $scope.removeError = 'cannot remove simulation';
        }
      });
  };
  $scope.toRemove = toRemove;
}

})();
