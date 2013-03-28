'use strict';

/* Services */

angular.module("idletalkServices", []).
    factory('firebaseService', function($rootScope) {
        //Partially based on: https://gist.github.com/katowulf/5006634
        
        ///////////////////////////////////////////////////////////////////////
        // Configuration
        ///////////////////////////////////////////////////////////////////////
        var firebaseService = {};
        
        var FIREBASE_URL = 'http://idletalk.firebaseIO.com/';
        
        // when true, all Firebase ops are logged to the JavaScript console
        // some critical errors and warnings are always logged, even if this is false
        var DEVMODE = true;
        
        // create a dummy console object for dummy IE
        //if( typeof(console) === 'undefined' ) {
        //    var f = function(){};
        //    var console = { log: f, info: f, warn: f, error: f };
        //}
        
        //add support for 'trim' to sad and lonely browsers
        if (!String.prototype.trim) {
            //code for trim
            String.prototype.trim=function(){return this.replace(/^\s+|\s+$/g, '');};
        }
        
        ///////////////////////////////////////////////////////////////////////
        // Private Methods
        ///////////////////////////////////////////////////////////////////////
        
        function validateArgs(eventName){
            if(!eventName){
                throw "eventName is required.";
            }
        }
        
        function fbServicePath(path){
            var firebaseRef = null;
            if(path){
                firebaseRef = firebaseService.ref.child(path);
            }
            else{
                firebaseRef = firebaseService.ref;
            }
            return firebaseRef;
        }
        
        ///////////////////////////////////////////////////////////////////////
        // Public Methods
        ///////////////////////////////////////////////////////////////////////
        
        //should never be called directly, but is available for custom calls. 
        firebaseService.ref = new Firebase(FIREBASE_URL);
        
        /**
        * Calls Firebase.once() on the path. The promise is fulfilled with the returned value.
        * If the operation fails, then the promise will be rejected.
        * If a `context` is provided, then all callbacks will have `this` set to `context`
        *
        * @param {String} path passed into FireBase.child() method
        * @param {String} event
        * @return {jQuery.Deferred} resolves with return argument: snapshot
        */
        firebaseService.once = function(path, eventName){
            
            validateArgs(eventName);
            var firebaseRef = fbServicePath(path);
            
            var def = $.Deferred();
            firebaseRef.once(eventName,
                function () {  
                    var args = arguments;
                    $rootScope.$apply(function () {
                        DEVMODE && console.log('firebase "once"', eventName, args);
                        def.resolveWith(firebaseRef, args);
                        //callback.apply(firebaseRef, args);
                    });
                },function() {
                    console.error('firebase "once" call failed.', path, eventName);
                    def.rejectWith(firebaseRef, ['firebase "once" call failed.']);
                });
            return def;
        }
         /**
        * Monitors a Firebase path using a promise contract.
        *
        * <pre>
        *     firebaseService.on('users', 'child_added')
        *       .progress( childAdded )
        *       .fail( securityError )
        *       .done( listenerDisposed )
        * </pre>
        *
        * The progress() method is invoked any time the requested event(s) occur.
        * If the path becomes inaccessible at any time (due to security) then the reject() method is fired.
        *
        * The progress callback receives one argument: progressCallback( snapshot )
        *
        * Instead of maintaining a reference to the function and later calling Firebase.off, you may
        * simply invoke the custom `dispose` method on the promise, which will clean up all connections.
        * When dispose is called, the promise is immediately fulfilled, so this can be used as an event listener as well.
        *
        * @param {String} path passed into FireBase.child() method
        * @param {String} event
        * @return {jQuery.Deferred}
        */
        firebaseService.on = function (path, eventName) {
            
            validateArgs(eventName);
            var firebaseRef = fbServicePath(path);
           
            DEVMODE && console.log('firebase "on" started', eventName);
            var def = $.Deferred();
            var callback = function () {  
                var args = arguments;
                $rootScope.$apply(function () {
                    DEVMODE && console.log('firebase "on" handled',path, eventName, args);
                    def.notifyWith(firebaseRef, args);
                        //callback.apply(firebaseRef, args);
                });
            };
            firebaseRef.on(eventName, callback, def.reject);

            return $.extend(def.promise(), {
                dispose: function() {
                    firebaseRef.off(eventName, callback);
                    def.resolveWith(firebaseRef, [eventName]);
                }
            });
    	};
        
        
        
		firebaseService.push =  function(path, data) {
            if(!data){
                throw "data is required";
            };
            var firebaseRef = fbServicePath(path);
            DEVMODE && console.log('firebase "push" called', JSON.stringify(data));
            
			return firebaseRef.push(data).name();
            
		}
        
        
        
        return firebaseService;
    })
    .factory('webRTCService', ['firebaseService', function(firebaseService){
        //service keeps track of webrtc session information.
        //code taken from https://github.com/firebase/gupshup/blob/gh-pages/js/chat.js
        var webRTCService = {};
        
        
        // Ugh, globals.
        var peerc;
        webRTCService.myUserID = null;
        var mainRef = firebaseService.ref;
        //default error and log handlers.
        var error = function(e){
            if (typeof e == typeof {}) {
                console.log("Oh no! " + JSON.stringify(e));
            } else {
                console.log("Oh no! " + e);
            }
            webRTCService.handleEndCall();
        }
        var log = function(info){
            console.log(info);
        }
        // Shim Firefox & Chrome. Interop stuff.
        var makePC = null;
        var browser = null;
        var getUserMedia = null;
        var RTCPeerConnection = null;
        var attachMediaStream = null;
        var mediaConstraints = {
            "mandatory": {
                "OfferToReceiveAudio":true, 
                "OfferToReceiveVideo":true
            }
        };
        
        // Add an a=crypto line for SDP emitted by Firefox.
        // This is backwards compatibility for Firefox->Chrome calls because
        // Chrome will not accept a=crypto-less offers and Firefox only
        // does DTLS-SRTP.
        function ensureCryptoLine(sdp) {
            if (browser !== "firefox") {
                return sdp;
            }

            var sdpLinesIn = sdp.split('\r\n');
            var sdpLinesOut = [];

            // Search for m line.
            for (var i = 0; i < sdpLinesIn.length; i++) {
                sdpLinesOut.push(sdpLinesIn[i]);
                if (sdpLinesIn[i].search('m=') !== -1) {
                    sdpLinesOut.push("a=crypto:1 AES_CM_128_HMAC_SHA1_80 inline:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");
                } 
            }

            sdp = sdpLinesOut.join('\r\n');
            return sdp;
        }
        
        function adapter() {
            // https://code.google.com/p/webrtc-samples/source/browse/trunk/apprtc/js/adapter.js.
            if (navigator.mozGetUserMedia) {
                browser = "firefox";
                makePC = function() {
                    return new mozRTCPeerConnection({
                        "iceServers": [{"url": "stun:23.21.150.121"}]
                    }, {"optional": []});
                };
                getUserMedia = navigator.mozGetUserMedia.bind(navigator);
                attachMediaStream = function(element, stream) {
                    element.mozSrcObject = stream;
                    element.play();
                };
                mediaConstraints.mandatory["MozDontOfferDataChannel"] = true;
                window.RTCIceCandidate = window.mozRTCIceCandidate;
                window.RTCSessionDescription = window.mozRTCSessionDescription;
            } else if (navigator.webkitGetUserMedia) {
                browser = "chrome";
                makePC = function() {
                return new webkitRTCPeerConnection({
                    "iceServers": [{"url": "stun:stun.l.google.com:19302"}],
                    }, {"optional": [{"DtlsSrtpKeyAgreement": true}]});
                };
                getUserMedia = navigator.webkitGetUserMedia.bind(navigator);
                attachMediaStream = function(element, stream) {
                    element.src = webkitURL.createObjectURL(stream);
                    element.play();
                };
            }
        }
        
        
        
        
        
        
        webRTCService.emailHashID = function(emailAddress){
            return md5(emailAddress.trim().toLowerCase());
        }
        
        webRTCService.registerRemove = function(userSDP, userStatus){
            
            userSDP.onDisconnect().remove();
            userStatus.onDisconnect().set(false);

            $(window).unload(function() {
                userSDP.set(null);
                userStatus.set(false);
            });
        }
        
        webRTCService.init = function(name, email, geoData, handleError, handleLog){
            if(handleError){
                error = handleError;
            }
            if(handleLog){
               log = handleLog; 
            }
            
            if (!navigator.mozGetUserMedia && !navigator.webkitGetUserMedia) {
                error("Sorry, getUserMedia is not available!");
                return;
            }
            if (!window.mozRTCPeerConnection && !window.webkitRTCPeerConnection) {
                error("Sorry, PeerConnection is not available!");
                return;
            }
            adapter();

            // Ask user to login.
            //var name = prompt("Enter your username", "Guest" + Math.floor(Math.random()*100)+1);

            webRTCService.myUserID = webRTCService.emailHashID(email);
            var userRef = mainRef.child(webRTCService.myUserID);
            var userEmailHash = userRef.child("hash");
            var userSDP = userRef.child("sdp");
            var userICE = userRef.child("ice");
            var userStatus = userRef.child("presence");
            var userGeoData= userRef.child("geoData");
            userGeoData.set(geoData);
            userEmailHash.set(webRTCService.emailHashID(email));
            //set email address,
            //set geolocation data. 
            
            //Register Removal tools
            webRTCService.registerRemove(userSDP, userStatus);
            

            // Now online.
            userStatus.set(true);
        }
        
        webRTCService.setUserSDP = function(sdpVal){
            var userSDP = mainRef.child(webRTCService.myUserID).child("sdp");
            userSDP.set(sdpVal);
        }
        
        webRTCService.setUserICE = function(iceVal){
            var userSDP = mainRef.child(webRTCService.myUserID).child("ice");
            userSDP.set(iceVal);
        }
        
        webRTCService.setICECandidate = function(iceData){
            var candidate = new RTCIceCandidate({
                sdpMLineIndex: iceData.label, candidate: iceData.candidate
            });
            peerc.addIceCandidate(candidate);
            webRTCService.setUserICE(null);
        }
        
        webRTCService.handleIncomingAnswer = function(answer){
            var desc = new RTCSessionDescription(JSON.parse(answer));
            peerc.setRemoteDescription(desc, function() {
                log("Call established!");
            }, error);
        }
        
        webRTCService.handleAcceptCall = function(offer, fromUser){
            log("Incoming call with offer " + offer);
            getUserMedia({video:true, audio:true}, function(vs) {
                attachMediaStream(document.getElementById("localvideo"), vs);
                var pc = makePC();
                peerc = pc;
                pc.onicecandidate = function(event) {
                    if (event.candidate) {
                        var iceSend = {
                            to: fromUser,
                            label: event.candidate.sdpMLineIndex,
                            id: event.candidate.sdpMid,
                            candidate: event.candidate.candidate
                        };
                        mainRef.child(iceSend.to).child("ice").set(iceSend);
                    } else {
                        log("End of ICE candidates");
                    }
                };
                pc.addStream(vs);

                pc.onaddstream = function(obj) {
                    log("Got onaddstream of type " + obj.type);
                    attachMediaStream(document.getElementById("remotevideo"), obj.stream);
                    //document.getElementById("dialing").style.display = "none";
                    //document.getElementById("hangup").style.display = "block";
                };

                var desc = new RTCSessionDescription(JSON.parse(offer));
                pc.setRemoteDescription(desc, function() {
                log("setRemoteDescription, creating answer");
                pc.createAnswer(function(answer) {
                    answer.sdp = ensureCryptoLine(answer.sdp);
                    pc.setLocalDescription(answer, function() {
                        // Send answer to remote end.
                        log("created Answer and setLocalDescription " + JSON.stringify(answer));
                        var toSend = {
                            type: "answer",
                            to: fromUser,
                            from: webRTCService.myUserID,
                            answer: JSON.stringify(answer)
                        };
                        var toUser = mainRef.child(toSend.to);
                        var toUserSDP = toUser.child("sdp");
                        toUserSDP.set(toSend);
                    }, error);
                }, error, mediaConstraints);
                }, error);
            }, error);
        }
        
        webRTCService.handleInitiateCall = function (userid) {
  //document.getElementById("main").style.display = "none";
  //document.getElementById("call").style.display = "block";

  getUserMedia({video:true, audio:true}, function(vs) {
    attachMediaStream(document.getElementById("localvideo"), vs);
    var pc = makePC();
    peerc = pc;
    pc.onicecandidate = function(event) {
      if (event.candidate) {
        var iceSend = {
          to: userid,
          label: event.candidate.sdpMLineIndex,
          id: event.candidate.sdpMid,
          candidate: event.candidate.candidate
        };
        mainRef.child(iceSend.to).child("ice").set(iceSend);
      } else {
        log("End of ICE candidates");
      }
    };
    pc.addStream(vs);

    pc.onaddstream = function(obj) {
      log("Got onaddstream of type " + obj.type);
      attachMediaStream(document.getElementById("remotevideo"), obj.stream);
      document.getElementById("dialing").style.display = "none";
      document.getElementById("hangup").style.display = "block";
    };

    pc.createOffer(function(offer) {
      offer.sdp = ensureCryptoLine(offer.sdp);
      log("Created offer" + JSON.stringify(offer));
      pc.setLocalDescription(offer, function() {
        // Send offer to remote end.
        log("setLocalDescription, sending to remote");
        var toSend = {
          type: "offer",
          to: userid,
          from: webRTCService.myUserID,
          offer: JSON.stringify(offer)
        };
        var toUser = mainRef.child(toSend.to);
        var toUserSDP = toUser.child("sdp");
        toUserSDP.set(toSend);
      }, error);
    }, error, mediaConstraints);
  }, error);
}
        
        webRTCService.handleEndCall =  function() {
            log("Ending call");
            document.getElementById("call").style.display = "none";
            document.getElementById("main").style.display = "block";

            document.getElementById("localvideo").pause();
            document.getElementById("remotevideo").pause();
            document.getElementById("localvideo").src = null;
            document.getElementById("remotevideo").src = null;

            peerc = null;
        }
        
        return webRTCService;
    }])
    .factory('idleTalkStorageService', ['webRTCService','firebaseService', function(webRTCService, firebaseService){
        //service keeps track of user session information across controllers. 
        
        var idleTalkStorageService = {};
        idleTalkStorageService.displayName = "";
        idleTalkStorageService.email = "";
        idleTalkStorageService.geoLocationData = null;
        idleTalkStorageService.users = {};
        
        
        
        function updateUser(snapshot){
            idleTalkStorageService.users[snapshot.name()] = snapshot.val();
        };
        function removeUser(snapshot){
            delete idleTalkStorageService.users[snapshot.name()];
        }
        
        idleTalkStorageService.loginHandler = function(){
            webRTCService.init(idleTalkStorageService.displayName, idleTalkStorageService.email, idleTalkStorageService.geoLocationData)
        }
        
        //setup the 
        idleTalkStorageService.init = function(handleIncomingOffer){

            //handle users listing
            var deferred = firebaseService.once(null, 'value');
            $.when(deferred).done(function(snapshot){
                console.log('once deferred:', snapshot.val())
                idleTalkStorageService.users = snapshot.val();
            });
        
            //handler for a new user joining the site.
            $.when(firebaseService.on(null,'child_added')).progress(function(snapshot){
                var data = snapshot.val();
                if (data.presence) {
                    updateUser(snapshot);
                }
            });
        
        
            //handler for a user changing /logging in or logging out. 
            $.when(firebaseService.on(null,'child_changed')).progress(function(snapshot){
                var data = snapshot.val();
                if (data.presence) {
                    updateUser(snapshot);
                }
                if (!data.presence) {
                    removeUser(snapshot.name());
                }
                if (data.sdp && data.sdp.to == webRTCService.myUserID) {
                    if (data.sdp.type == "offer") {
                        handleIncomingOffer(data.sdp.offer, data.sdp.from);
                        webRTCService.setUserSDP();
                    }
                    if (data.sdp.type == "answer") {
                        webRTCService.handleIncomingAnswer(data.sdp.answer);
                        webRTCService.setUserSDP();
                    }
                }
                if (data.ice && data.ice.to == webRTCService.myUserID) {
                    webRTCService.setICECandidate(data.ice);
                }
            });
        }
        
        return idleTalkStorageService;
    }]);