 //List Helper

    var user_id = String;
    var curr_token = String;

    (function() {

        /**
         * Obtains parameters from the hash of the URL
         * @return Object
         */
        function getHashParams() {
            var hashParams = {};
            var e, r = /([^&;=]+)=?([^&;]*)/g,
                q = window.location.hash.substring(1);
            while (e = r.exec(q)) {
                hashParams[e[1]] = decodeURIComponent(e[2]);
            }
            return hashParams;
        }

        var userProfileSource = document.getElementById('user-profile-template').innerHTML,
            userProfileTemplate = Handlebars.compile(userProfileSource),
            userProfilePlaceholder = document.getElementById('user-profile');

        var oauthSource = document.getElementById('oauth-template').innerHTML,
            oauthTemplate = Handlebars.compile(oauthSource),
            oauthPlaceholder = document.getElementById('oauth');

        var plListSource = document.getElementById('pl_list_template').innerHTML,
            plListTemplate = Handlebars.compile(plListSource),
            plListPlaceholder = document.getElementById('pl_list');

        var params = getHashParams();
        curr_token = params.access_token;
        var access_token = curr_token,
            refresh_token = params.refresh_token,
            error = params.error;


        /*************************************
        *
        ************************************/
        Handlebars.registerHelper('each', function(context, options) {
            //MODIFYING FOR TEST PRUPOSES
            var out = "<ul>";
            var inner = "<ul>"

            for (var i = 0, l = context.length; i < l-5; i++) {
                var item = options.fn(context[i])
                var p_uri = context[i].p_uri;
                console.log(p_uri);
                var songBox = "<iframe src='https://embed.spotify.com/?uri=" + p_uri + "' width:'300' height='300' frameborder='0' allowtransparency='true'></iframe>"
                    console.log("songBox",songBox);

                // for (var j = 0; j < context[i]['tracks'].length; j++) {
                //     var trackName = context[i]['tracks'][j]['name'];
                //     var trackUri = context[i]['tracks'][j]['uri'];

                //     inner = inner + songBox;
                // }
                inner = inner + "</ul>";
                out = out + "<li>" + item + songBox + "</li>";



            }
            return out + "</ul>";
        });



        console.log(curr_token);

        if (error) {
            alert('There was an error during the authentication');
        } else {
            if (access_token) {
                // render oauth info
                oauthPlaceholder.innerHTML = oauthTemplate({
                    access_token: access_token,
                    refresh_token: refresh_token
                });

                $.ajax({
                    url: 'https://api.spotify.com/v1/me',
                    headers: {
                        'Authorization': 'Bearer ' + access_token
                    },
                    success: function(response) {

                        user_id = response.id;

                        userProfilePlaceholder.innerHTML = userProfileTemplate(response);

                        $('#login').hide();
                        $('#loggedin').show();
                    }
                });
            } else {
                // render initial screen
                $('#login').show();
                $('#loggedin').hide();
            }

            document.getElementById('obtain-new-token').addEventListener('click', function() {
                $.ajax({
                    url: '/refresh_token',
                    data: {
                        'refresh_token': refresh_token
                    }
                }).done(function(data) {
                    access_token = data.access_token;


                    oauthPlaceholder.innerHTML = oauthTemplate({
                        access_token: access_token,
                        refresh_token: refresh_token
                    });
                });
            }, false);
        }

        document.getElementById('get_playlists').addEventListener('click', function() {
            $.ajax({
                url: '/get_playlists',
                data: {
                    'user_id': user_id,
                    access_token: curr_token
                },
                dataType: 'json'
            }).done(function(data) {

                var items = {
                    playlists: data
                }
                console.log("these are my items", items);
                plListPlaceholder.innerHTML = plListTemplate(items);

            })
        })

    })();