
 /*******************************
  * Map script
  *
  *****************************/

 // Note: This requires that you consent to location sharing when
 // prompted by your browser. If you see a blank space instead of the map, this
 // is probably because you have denied permission for location sharing.


 var map;


/*********************************************
*Creation of google map and click handler for icons to connect to websocket
**********************************************/
 function initialize() {

     var mapOptions = {
         zoom: 6
     };
     map = new google.maps.Map(document.getElementById('map-canvas'),
         mapOptions);

     // Try HTML5 geolocation
     if (navigator.geolocation) {
         navigator.geolocation.getCurrentPosition(function(position) {
             var pos = new google.maps.LatLng(position.coords.latitude,
                 position.coords.longitude);


             var marker1Pos = new google.maps.LatLng(33.684818, -117.795199);
             var marker1 = new google.maps.Marker({
                 position: marker1Pos,
                 map: map,
                 icon: 'radio_tower.png'
             });


             //Connect to web socket
             google.maps.event.addListener(marker1, 'click', function() {
                 var socket = io.connect('localhost:1234');
                 socket.on('news', function(data) {
                     console.log(data);
                     console.log("HELLO!")
                     socket.emit('my other event', {
                         my: 'data'
                     });
                 });
             });



             map.setCenter(pos);
         }, function() {
             handleNoGeolocation(true);
         });
     } else {
         // Browser doesn't support Geolocation
         handleNoGeolocation(false);
     }

 }


/*********************************************
*
**********************************************/
 function handleNoGeolocation(errorFlag) {
     if (errorFlag) {
         var content = 'Error: The Geolocation service failed.';
     } else {
         var content = 'Error: Your browser doesn\'t support geolocation.';
     }

     var options = {
         map: map,
         position: new google.maps.LatLng(60, 105),
         content: content
     };


     var infowindow = new google.maps.InfoWindow(options);
     map.setCenter(options.position);
 }


 google.maps.event.addDomListener(window, 'load', initialize);