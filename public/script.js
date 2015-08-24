(function() {
    var user = {
        id: undefined,
        username: undefined,
        spotify_id: undefined,
        playlists: []
    };

    var currentPl = 0;

    function getHashParams() {
        var hashParams = {};
        var e, r = /([^&;=]+)=?([^&;]*)/g,
            q = window.location.hash.substring(1);
        while (e = r.exec(q)) {
            hashParams[e[1]] = decodeURIComponent(e[2]);

        }
        return hashParams;
    }


    //gets the auth hash from the url for use to make API calls
    var params = getHashParams();
    var curr_token = params.access_token;
    var access_token = curr_token,
        refresh_token = params.refresh_token;

    user.id = params.id;
    user.username = params.username;

    error = params.error;


    /************************
     *   Ajax request to retrieve users ID and then
     *   to retrieve the users playlists and appends them to the DOM
     *   with the Sptofy widget(iframe)
     *
     */
    if (error) {
        alert('There was an error during the authentication');
    } else {
        if (access_token) {

            //load users data into the profile
            $.ajax({
                url: 'https://api.spotify.com/v1/me',
                headers: {
                    'Authorization': 'Bearer ' + access_token
                },
                success: function(response) {
                    console.log("spot response", response.id);
                    user.spotify_id = response.id;

                    $('#login').hide();
                    $('#loggedin').show();
                    $('#profileName').html(user['username']);

                    {

                        $.ajax({
                            url: '/get_playlists',
                            headers: {
                                'Authorization': 'Bearer ' + access_token
                            },
                            data: {
                                spotify_id: user.spotify_id,
                                access_token: access_token
                            },
                            success: function(response) {
                                user.playlists = response;
                                console.log('playlist data', user.playlists);
                                var playlistBox = $('<iframe>').attr({
                                    src: 'https://embed.spotify.com/?uri=' + user.playlists[0].p_uri,
                                    frameborder: 0,
                                    width: '100%',
                                    height: '100%',
                                    class: 'spotWidget'
                                });

                                $('#pl_box').append(playlistBox);

                            }

                        });

                    }
                }
            });

        } else {
            // render profile screen
            $('#login').show();
            $('#loggedin').hide();

        }
    }

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
                marker1.setIcon('radio_tower_selected.png');
                 var socket = io.connect('localhost:1234');
                 socket.emit('bcInfo', {
                    data : user.playlists[currentPl].p_uri
                 });
                 socket.on('bcInfo', function(data){
                    console.log(data);
                 })
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
* Basic error functionality incase geolocations fails or is not supported
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



 /***********************
 * jQuery here
 *************************/

    $(document).ready(function() {

        //tabs reload the playlists uri into the iframe
        //only way around it
        $('.plBtn').click(function() {
            $('.spotWidget').attr("src", "https://embed.spotify.com/?uri=" + user.playlists[$(this).html() - 1].p_uri);
            currentPl = $(this).html() - 1;

        });
        //function loads song related album cover images into the bootstrap modal
        $('#favSong1').click(function() {

            var tracks = user.playlists[currentPl].tracks;
            console.log(tracks)
            $('.modal-body').empty();
            for (var i = 0, len = tracks.length; i < len; i++) {
                var songBox = $('<div>').attr('class','songBox'),
                    songImg = $('<img>').attr('src', tracks[i]['img']).css({
                    'max-width': '50%',
                    'max-height': '50%'
                });
                var songName = $('<p>').html(tracks[i]['name']).css('color',"#F9C530"),
                    artist = $('<p>').html(tracks[i]['artist']).css('color',"white");

                $('.modal-body').append(songBox);
                $(songBox).append(songImg);
                $(songBox).append(songName);
                $(songBox).append(artist);

            }
        });
    });


 }());