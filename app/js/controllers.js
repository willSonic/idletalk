'use strict';

/* Controllers */

function IdleTalkLoginCtrl($scope, $location, idleTalkStorageService) {
    
    $(".toggle").each(function(index, toggle) {
        toggleHandler(toggle);
    });
    
    $(".checkbox, .radio").click(function(){
        setupLabel();
    });
    
    $scope.loginName = idleTalkStorageService.displayName;
    $scope.loginEmail = idleTalkStorageService.email;
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
    $scope.locationData = idleTalkStorageService.geoLocationData;
    $scope.isUserMediaSupported = (navigator.mozGetUserMedia  || navigator.webkitGetUserMedia) ? true: false;
    $scope.isSubmitEnabled = function(){
        return !($scope.loginName && $scope.loginEmail && $scope.locationData && $scope.isGeoSupported)
    }
    
    $scope.geoLocationHandler = function(){
        if (navigator.geolocation)
        {
            navigator.geolocation.getCurrentPosition(function (position)
            {
                alert("Latitude: " + position.coords.latitude + "<br>Longitude: " + position.coords.longitude); 
                idleTalkStorageService.geoLocationData = position.coords;
                $scope.locationData = position.coords;
                //$scope.apply();
            });
        }
        else
        {
            alert("Geolocation is not supported by this browser.");
        }
    };
    
    $scope.submit = function(){
        
        
        idleTalkStorageService.loginHandler();
        $location.path('/map');
    }
}

//PhoneListCtrl.$inject = ['$scope', '$http'];
function IdleTalkMapCtrl($scope, idleTalkStorageService,  webRTCService, firebaseService){
    $("#map").gmap3({
  map:{
    options:{
      center:[46.578498,2.457275],
      zoom: 5
    }
  },
  marker:{
    values:[
      {latLng:[idleTalkStorageService.geoLocationData.latitude, idleTalkStorageService.geoLocationData.longitude], data:"Paris !"},
      {address:"86000 Poitiers, France", data:"Poitiers : great city !"},
      {address:"66000 Perpignan, France", data:"Perpignan ! GO USAP !", options:{icon: "http://maps.google.com/mapfiles/marker_green.png"}}
    ],
    options:{
      draggable: false
    },
    events:{
      mouseover: function(marker, event, context){
        var map = $(this).gmap3("get"),
          infowindow = $(this).gmap3({get:{name:"infowindow"}});
        if (infowindow){
          infowindow.open(map, marker);
          infowindow.setContent(context.data);
        } else {
          $(this).gmap3({
            infowindow:{
              anchor:marker, 
              options:{content: context.data}
            }
          });
        }
      },
      mouseout: function(){
        var infowindow = $(this).gmap3({get:{name:"infowindow"}});
        if (infowindow){
          infowindow.close();
        }
      }
    }
  }
});
    idleTalkStorageService.init(function(){
        console.log('incomming call');
    });
    $scope.users = idleTalkStorageService.users;
}

function IdleTalkHomeCtrl($scope, $routeParams, firebaseService) {
    
}

//PhoneDetailCtrl.$inject = ['$scope', '$routeParams'];