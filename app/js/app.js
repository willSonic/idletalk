/* App Module */

angular.module('idletalk', ['idletalkServices']).
  config(['$routeProvider', function($routeProvider) {
  $routeProvider.
      when('/login', {templateUrl: 'app/partials/login.html',   controller: IdleTalkLoginCtrl}).
      when('/home/:phoneId', {templateUrl: 'app/partials/home.html', controller: IdleTalkHomeCtrl}).
      otherwise({redirectTo: '/login'});
}]);