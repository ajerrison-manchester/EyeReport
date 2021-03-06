﻿angular.module('eyereport.controllers', [])

.controller('StepsCtrl', function ($scope, $ionicModal) {
    $scope.data = {};

    $scope.openModal = function () {
        $ionicModal.fromTemplateUrl('templates/modal-steps.html', {
            scope: $scope,
            animation: 'slide-in-up'
        }).then(function (modal) {
            $scope.modal = modal;
            $scope.modal.show();
        });
    };

    $scope.openModalEye = function () {
        $ionicModal.fromTemplateUrl('templates/modal-eye.html', {
            scope: $scope,
            animation: 'slide-in-up'
        }).then(function (modal) {
            $scope.modal = modal;
            $scope.modal.show();
        });
    };

    $scope.openModalConsent = function () {
        $ionicModal.fromTemplateUrl('templates/modal-consent.html', {
            scope: $scope,
            animation: 'slide-in-up'
        }).then(function (modal) {
            $scope.modal = modal;
            $scope.modal.show();
        });
    };

    $scope.openModalActiveTask = function () {
        $ionicModal.fromTemplateUrl('templates/modal-activetasks.html', {
            scope: $scope,
            animation: 'slide-in-up'
        }).then(function (modal) {
            $scope.modal = modal;
            $scope.modal.show();
        });
    };

    $scope.openModalTest = function () {
        $ionicModal.fromTemplateUrl('templates/modal-test.html', {
            scope: $scope,
            animation: 'slide-in-up'
        }).then(function (modal) {
            $scope.modal = modal;
            $scope.modal.show();
        });
    };

    $scope.closeModal = function () {
        $scope.modal.remove();
    };

    // Cleanup the modal when we're done with it!
    $scope.$on('$destroy', function () {
        $scope.modal.remove();
    });

    // Execute action on hide modal
    $scope.$on('modal.hidden', function () {
        // Execute action
    });

    // Execute action on remove modal
    $scope.$on('modal.removed', function () {
        // Execute action
    });
})

.controller('ResultsCtrl', ['irkResults', '$scope', function (irkResults, $scope) {
    $scope.results = irkResults.getResults();

    $scope.CLDEQTotal = irkResults.sumIDResults("cldeq");

    $scope.noPhotoResults = irkResults.getAllNoPhotoResults();
}])


.controller('AboutCtrl', ['$scope', function ($scope) {
    
}])

.controller('ActiveTasksCtrl', function ($scope, $ionicModal) {
    //$scope.openModalActiveTask = function () {
    //    $ionicModal.fromTemplateUrl('templates/modal-activetasks.html', {
    //        scope: $scope,
    //        animation: 'slide-in-up'
    //    }).then(function (modal) {
    //        $scope.modal = modal;
    //        $scope.modal.show();
    //    });
    //};

    //$scope.closeModal = function () {
    //    $scope.modal.remove();
    //};

    //// Cleanup the modal when we're done with it!
    //$scope.$on('$destroy', function () {
    //    $scope.modal.remove();
    //});

    //// Execute action on hide modal
    //$scope.$on('modal.hidden', function () {
    //    // Execute action
    //});

    //// Execute action on remove modal
    //$scope.$on('modal.removed', function () {
    //    // Execute action
    //});
})