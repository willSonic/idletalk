'use strict';

/* Controllers */

function IdleTalkLoginCtrl($scope, $http) {
    $scope.loginName = '';
    $scope.loginEmail = '';
    $scope.loginImage = 'app/images/illustrations/infinity.png';
    
    $scope.loginEmailChanged = function(){
        if($scope.loginEmail.length){
            $scope.loginImage= 'http://www.gravatar.com/avatar/' + md5($scope.loginEmail);
        }
        else{
            $scope.loginImage = 'app/images/illustrations/infinity.png';
        }
        
    }
    
    $scope.submit = function(){
        
    }
}

//PhoneListCtrl.$inject = ['$scope', '$http'];


function IdleTalkHomeCtrl($scope, $routeParams) {
  $scope.phoneId = $routeParams.phoneId;
}

//PhoneDetailCtrl.$inject = ['$scope', '$routeParams'];