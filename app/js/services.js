'use strict';

/* Services */

angular.module("idletalkServices", []).
    factory('firebaseService', function($defer) {
        var firebaseService = {};
        firebaseService.messageholder = {messages:{}};
        firebaseService.ref = new Firebase("http://idletalk.firebaseIO.com/");
        firebaseService.ref.on("value", function(messageSnapshot) {
            $defer(function() {
                firebaseService.messageholder.messages = messageSnapshot.val();
            }, 0);
        });

        firebaseService.getMessages = function() {
            return firebaseService.cakes;
        };
        firebaseService.addMessage = function(name, text) {
            firebaseService.ref.push({
                name: name,
                text: text
            });
        };

        return firebaseService;
    });
