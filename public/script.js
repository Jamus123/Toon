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

    var params = getHashParams();
    var curr_token = params.access_token;
    var access_token = curr_token,
        refresh_token = params.refresh_token;

    user.id = params.id;
    user.username = params.username;

    error = params.error;


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
                    // $('#username').html(user['username']);

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
                                console.log("this is my first playlist uri", user.playlists[0].p_uri);
                                //Spotify widget needs heavy CSS refactoring :/
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
            // render initial screen
            $('#login').show();
            $('#loggedin').hide();

        }
    }



    //basic popover functionality
    // $('.popover-markup>.trigger').popover({
    //     html: true,
    //     title: function() {
    //         return $(this).parent().find('.head').html();
    //     },
    //     content: function() {
    //         return $(this).parent().find('.content').html();
    //     }
    // })


    // jquery event to create popover and change the username
    // $('body').on('click', '#name_change_btn', function() {
    //     console.log("in the name change click handler");
    //     var nameChange = $('#nameChgInpt').val();
    //     $.ajax({
    //         data: {
    //             id: user.id,
    //             nameChange: nameChange
    //         },
    //         url: "/change_user",
    //         success: function(response) {
    //             if (response.error) {
    //                 console.log(response.error);
    //             } else {
    //                 $('#username').html(nameChange);
    //                 $('.nameChgPop>.trigger').popover('hide');
    //             }

    //         }
    //     })
    // });


    $(document).ready(function() {

        //tabs reload the playlists uri into the iframe
        //only way around it
        $('.plBtn').click(function(){
            console.log(user.playlists[$(this).html() - 1])
            $('.spotWidget').attr("src", "https://embed.spotify.com/?uri=" + user.playlists[$(this).html() - 1].p_uri);
            currentPl = $(this).html() - 1;

        });

        $('#favSong1').click(function(){
            var tracks = user.playlists[currentPl].tracks;
            console.log(tracks);
            for(var i = 0, len = tracks.length; i < len; i++)
            {
                var songBox = $('<img>').attr('src', tracks[i]['img']);
                $('.modal-body').append(songBox);
            }
        });
    });

}());

//User profile Initialization
