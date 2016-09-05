/*******************************************************************************
 * Copyright (c) 2016 IBM Corp.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *******************************************************************************/

//control the LEDs on a virtual board

'use strict';

angular.module('iotBoardApp')
.controller('ledCtrl', ['$scope', '$http', function($scope, $http) {

  console.log("LEDBoard : using controller 'ledCtrl'");
  
  //10 LED lights on the board
  $scope.leds = [{status:'red'}, {status:'red'}, {status:'red'}, {status:'red'}, {status:'red'}
  				,{status:'red'}, {status:'red'}, {status:'red'}, {status:'red'}, {status:'red'}];
  
  $scope.deviceId = ""; 	//id to register device for
  
  $scope.iotfClient = {};	//IoT foundation client connection
  
  $scope.registerDevice = function() {
	 console.log("Registering device for user " + $scope.gid);
	 $http({
	     url: "/iotboard/v1/devices",
	     method: "POST",
	     headers: {  
	                 'contentType': 'application/json; charset=utf-8"', //what is being sent to the server
	     },
	     data: JSON.stringify({deviceType: 'VirtualLEDBoard', deviceId: $scope.deviceId}).trim()
	   }).then(function (response) {
		    console.log('Device registration successful : response from server : ' + response.status);
		    $scope.iotf.iot_host = response.data.iotMessagingOrgAndHost;
		    $scope.iotf.iot_port = response.data.iotMessagingPort;
		    $scope.iotf.deviceId = response.data.deviceId;
		    $scope.iotf.password = response.data.deviceAuthToken;
		    $scope.iotf.iot_clientid = response.data.iotClientId;
		    $scope.iotf.eventTopic = response.data.eventTopic;
		    $scope.iotf.cmdTopic = response.data.cmdTopic;
		    console.log("IoTBoard : config : " + JSON.stringify($scope.iotf));
		    $scope.iotfClient = new Paho.MQTT.Client($scope.iotf.iot_host, $scope.iotf.iot_port, $scope.iotf.iot_clientid);
			$scope.iotfClient.onConnectionLost = onConnectionLost;
			connectDevice();
   		}, function (response) {
   			alert('Device registration failed : response from server : ' + response.data + ':' + response.status + "violations " + response.data.violations);
   		}
	 );
  }
//***************************************************************************************
// Test functions to be removed
//***************************************************************************************
  $scope.addSite = function() {
	  $scope.sites.push({sid:'Site number ' + $scope.sites.length, reg : {colour: 'red'}, player : {colour: 'red'}});
  }
  
  $scope.changeName = function() {
	$scope.sites[1].reg.colour = "green";  
  }
  
  $scope.testConnect = function() { 
	  $scope.iotf.iot_host = "pmoxqf.messaging.internetofthings.ibmcloud.com";
	  $scope.iotf.iot_port = 1883;
	  $scope.iotf.iot_clientid = "d:pmoxqf:vdev:adamTest";
	  $scope.iotf.password = "";
	  $scope.iotf.cmdTopic = "iot-2/cmd/+/fmt/json";
      $scope.iotfClient = new Paho.MQTT.Client($scope.iotf.iot_host, $scope.iotf.iot_port, $scope.iotf.iot_clientid);
	  $scope.iotfClient.onConnectionLost = onConnectionLost;
	  connectDevice();
  }
  
  $scope.testSendCommand = function() { 
		 console.log("Telling the server to send a command ");
		 $http({
		     url: "/iotboard/v1/devices/test",
		     method: "POST",
		     headers: {  'gameon-id': $scope.gid,
		                 'contentType': 'application/json; charset=utf-8"', //what is being sent to the server
		     },
		     data: $scope.iotf.deviceId
		   }).then(function (response) {
			    console.log('Command completed successfully');
	   		}, function (response) {
	   			alert('Command failed: ' + response.data + ':' + response.status);
	   		}
		 );
  }
  
  $scope.testTriggerplayer = function() { 
		 console.log("Telling the server to send a command ");
		 $http({
		     url: "/iotboard/v1/devices/testplayer",
		     method: "POST",
		     headers: {  'gameon-id': $scope.gid,
		                 'contentType': 'application/json; charset=utf-8"', //what is being sent to the server
		     },
		     data: $scope.gid
		   }).then(function (response) {
			    console.log('Command completed successfully');
	   		}, function (response) {
	   			alert('Command failed: ' + response.data + ':' + response.status);
	   		}
		 );
}

  
  $scope.testReceiveMessage = function() {
	  //setup a simulated event for receiving 
	  var event = {};
	  var d = {d: {led: 2, status: true}};
	  event.payloadString = JSON.stringify(d);
	  setTimeout(onMessageArrived, 3000, event);
	  event = {};
	  d = {d: {led: 2, status: false}};
	  event.payloadString = JSON.stringify(d);
	  setTimeout(onMessageArrived, 5000, event);
	  event = {};
	  d = {d: {led: 5, status: true}};
	  event.payloadString = JSON.stringify(d);
	  setTimeout(onMessageArrived, 7000, event);
  }
//*********************************************************************************************
  
	function onConnectSuccess() {
		// The device connected successfully
		console.log("Connected Successfully!");
		$scope.iotfClient.subscribe($scope.iotf.cmdTopic, {onSuccess: onSubscribeSuccess, onFailure: onSubscribeFailure});
		$scope.iotf.con.colour =  'green';
		$scope.iotf.msg = "Connected to IBM Watson IoT Platform!"
		$scope.$apply();
	}
	
	function onSubscribeSuccess() {
		$scope.iotfClient.onMessageArrived = onMessageArrived;
		$scope.iotf.sub.colour =  'green';
		$scope.iotf.msg = "Subscribed successfully to IBM Watson IoT Platform!"
		$scope.$apply();
	}
	
	function onSubscribeFailure() {
		$scope.iotf.sub.colour =  'red';
		$scope.iotf.alert = "Failed to subscribe to event messages!"
		$scope.$apply();
	}

	function onConnectFailure() {
		$scope.iotf.con.colour =  'red';
		$scope.iotf.alert = "Could not connect to IBM Watson IoT Platform!"
		$scope.$apply();
	}

	function connectDevice() {
		console.log("IoTBoard : Connecting device to IBM Watson IoT Platform...");
		$scope.iotfClient.connect({
			onSuccess: onConnectSuccess,
			onFailure: onConnectFailure,
			userName: "use-token-auth",
			password: $scope.iotf.password
		});
	}
	
	function onConnectionLost(responseObject) {
		if (responseObject.errorCode !== 0) {
			$scope.iotf.con.colour =  'red';
			$scope.iotf.alert = "Connection lost to IBM Watson IoT Platform! " + responseObject.errorMessage; 
			$scope.$apply();
		}
	}
  
  
  function onMessageArrived(event) {
	  var payload = JSON.parse(event.payloadString);
	  var msg = payload.d;
	  console.log("LEDBoard : processing incoming message : " + JSON.stringify(msg));
	  $scope.leds[msg.led].status = msg.status ? 'green' : 'red';
	  $scope.$apply();
  }
  

}]);