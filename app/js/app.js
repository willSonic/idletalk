/* App Module */

angular.module('idletalk', ['idletalkServices']).
    config(['$routeProvider', function($routeProvider) {
    $routeProvider.
        when('/login', {templateUrl: 'app/partials/login.html',   controller: IdleTalkLoginCtrl}).
        when('/map', {templateUrl: 'app/partials/map.html',   controller: IdleTalkMapCtrl}).
        when('/home/', {templateUrl: 'app/partials/home.html', controller: IdleTalkHomeCtrl}).
        otherwise({redirectTo: '/login'});
}]);