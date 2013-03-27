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
    };
    $scope.isGeoSupported = navigator.geolocation ? true:false;
    $scope.locationData = null;
    $scope.isUserMediaSupported = (navigator.mozGetUserMedia  || navigator.webkitGetUserMedia) ? true: false;
    
    
    $scope.geoLocationHandler = function(){
        if (navigator.geolocation)
        {
            navigator.geolocation.getCurrentPosition(function (position)
            {
                alert("Latitude: " + position.coords.latitude + "<br>Longitude: " + position.coords.longitude); 
                $scope.locationData = position.coords;
            });
        }
        else
        {
            alert("Geolocation is not supported by this browser.");
        }
    };
    
    $scope.submit = function(){
        
    }
}

//PhoneListCtrl.$inject = ['$scope', '$http'];
function IdleTalkMapCtrl($scope, webRTCService){
    $("#map").gmap3();
    webRTCService.testWrite();
}

function IdleTalkHomeCtrl($scope, $routeParams, firebaseService) {
    var socket = new WebSocket('ws://124.169.31.194:1337/');
    var sourcevid = document.getElementById('sourcevid');
    var remotevid = document.getElementById('remotevid');
    var localStream = null;
    var peerConn = null;
    var started = false;
    
    
  $scope.phoneId = $routeParams.phoneId;
  $scope.shareVideo = function(){
      // Replace the source of the video element with the stream from the camera
      try { //try it with spec syntax
        navigator.webkitGetUserMedia({audio: true, video: true}, successCallback, errorCallback);
      } catch (e) {
        navigator.webkitGetUserMedia("video,audio", successCallback, errorCallback);
      }
      function successCallback(stream) {
          sourcevid.src = window.webkitURL.createObjectURL(stream);
          localStream = stream;
      }
      function errorCallback(error) {
          console.error('An error occurred: [CODE ' + error.code + ']');
      }
      
  }
}

//PhoneDetailCtrl.$inject = ['$scope', '$routeParams'];