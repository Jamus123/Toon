//  module requires
var express = require('express'); // Express web server framework
var request = require('request'); // "Request" library
var Q = require('Q'); //promise library
var querystring = require('querystring');
var cookieParser = require('cookie-parser');
var mysql = require('mysql');
var morgan = require('morgan');
var bodyParser = require('body-parser');
var fs = require('fs');
var connection = mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    port: 3306,
    database: 'fp_test'
});
//app variables
var client_id = '9b2a0f5b21e54841854ffda54e619b2c',
    client_secret = '518f6bfb73be4dd4a4aefcc0a75fe800',
    redirect_uri = 'http://localhost:8888/callback',
    stateKey = 'spotify_auth_state',
    app = express(),
    server = require('http').Server(app),
    io = require('socket.io')(server);


//socket.io port for Irvine
server.listen(1234);


connection.connect(function(err) {
    if (err) {
        console.error('error connecting: ' + err.stack);
        return;
    }

    console.log('connected as id ' + connection.threadId);
});



/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
var generateRandomString = function(length) {
    var text = '';
    var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (var i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
};


/*********************************************
 * Socket for connecting users to what is currently being broadcasted
 *
 *  Will be moving this to its own module
 **********************************************/

var users = {};

io.on('connection', function(socket) {


    socket.on('bcInfo', function(data) {
        console.log("this is incoming data", data);

        var hasPl = false;

        for (var pl in users) {
            console.log(pl);
            if (data == pl) {
                hasPl = true;
            }
        }

        if (!hasPl) {
            socket.userPL = data;
            users[data] = data;
        }

        console.log("these are my global userPL's", users);

        setTimeout(function() {
            console.log("this is sendback data", data)
            socket.broadcast.emit('bcInfo', data);
        }, 3000);
    });

});


/*********************************************
 *  -Express function that defaults the users to the public directory
 *  - Creates a file stream logger using morgan for logging requests
 **********************************************/
app.use(express.static(__dirname + '/public'))
    .use(cookieParser());
var accessLogStream = fs.createWriteStream(__dirname + '/access.log', {
    flags: 'a'
});
app.use(morgan('combined', {
    stream: accessLogStream
}));


/*********************************************
 * Login route is called when the user clicks login from the landing page
 * User is directed to login with Spotify. After login the user is routed to the /callback
 * function with the redirect URI and there continues the login process.
 * 
 * @req - empty request body
 * @res - holds querystring holding auth options and redirect uri
 **********************************************/
app.get('/login', function(req, res) {

    var state = generateRandomString(16);
    res.cookie(stateKey, state);

    // application requests authorization
    var scope = 'user-read-private user-read-email playlist-read-collaborative playlist-read-private';
    res.redirect('https://accounts.spotify.com/authorize?' +
        querystring.stringify({
            response_type: 'code',
            client_id: client_id,
            scope: scope,
            redirect_uri: redirect_uri,
            state: state
        }));
});



/*********************************************
 *  This route checks to make the user has an auth token
 *   if they are logged in successfully they are checked in my DB if they exist.
 *  if they do not their spotify ID is saved to the DB
 **********************************************/
app.get('/callback', function(req, res) {
    // console.log(req);
    // application requests refresh and access tokens
    // after checking the state parameter
    var code = req.query.code || null;
    var state = req.query.state || null;
    var storedState = req.cookies ? req.cookies[stateKey] : null;

    if (state === null || state !== storedState) {
        res.redirect('/#' +
            querystring.stringify({
                error: 'state_mismatch'
            }));
    } else {
        res.clearCookie(stateKey);
        var authOptions = {
            url: 'https://accounts.spotify.com/api/token',
            form: {
                code: code,
                redirect_uri: redirect_uri,
                grant_type: 'authorization_code'
            },
            headers: {
                'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
            },
            json: true
        };

        request.post(authOptions, function(error, response, body) {
            var defer = Q.defer();

            var tokenAndId = {
                access_token: '',
                refresh_token: '',
                id: '',
                username: ''
            }

            if (!error && response.statusCode === 200) {

                tokenAndId['access_token'] = body.access_token,
                    tokenAndId['refresh_token'] = body.refresh_token;


                var options = {
                    url: 'https://api.spotify.com/v1/me',
                    headers: {
                        'Authorization': 'Bearer ' + tokenAndId['access_token']
                    },
                    json: true
                };

                // use the access token to access the Spotify Web API
                //Check if the spotifyId exists in my DB if not create row that uses their ID
                request.get(options, function(error, response, body) {
                    connection.query('SELECT * FROM `users` WHERE `spotify_id` = ' + body.id, function(error, results, fields) {
                        var getIdQuery = "SELECT `id`,`username` FROM `users` WHERE `spotify_id` = '" + body.id + "'";
                        console.log("THESE ARE MY RESULTS", results);
                        if (results != undefined && results != 0) {
                            console.log("this user already exists");
                            connection.query(getIdQuery, function(error, results, fields) {
                                tokenAndId['id'] = results[0]['id'];
                                tokenAndId['username'] = results[0]['username'];
                                console.log("this is my send back data after DB query", tokenAndId)
                                defer.resolve(tokenAndId);
                            });
                        } else {
                            post = {
                                'spotify_id': '' + body.id
                            };
                            connection.query("INSERT INTO `users` SET ?", post, function(error) {
                                connection.query(getIdQuery, function(error, results, fields) {
                                    console.log("THIS IS MYSQL ERROR", error)
                                    console.log("this is results from the new profile query", results);
                                    tokenAndId['id'] = results[0]['id'];
                                    tokenAndId['username'] = results[0]['username'];
                                    console.log("this is data after adding to DB", tokenAndId);
                                    defer.resolve(tokenAndId);
                                });
                            });

                        }
                    });

                });

                //return data in promise
                defer.promise.then(function(data) {
                    res.redirect('/#' +
                        querystring.stringify(data));
                });

            } else {
                res.redirect('/#' +
                    querystring.stringify({
                        error: 'invalid_token'
                    }));
            }
        });
    }
});

/*********************************************
 *  This is for users to request a new authorization token from spotify
 * in order to access the API from the client side. Currently not shown on the DOM
 **********************************************/
app.get('/refresh_token', function(req, res) {

    // requesting access token from refresh token
    var refresh_token = req.query.refresh_token;
    var authOptions = {
        url: 'https://accounts.spotify.com/api/token',
        headers: {
            'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
        },
        form: {
            grant_type: 'refresh_token',
            refresh_token: refresh_token
        },
        json: true
    };

    request.post(authOptions, function(error, response, body) {
        if (!error && response.statusCode === 200) {
            var access_token = body.access_token;
            res.send({
                'access_token': access_token
            });
        }
    });
});

/**************************
 * Currently changes the username from the database but later this 
 *  call will be user to change the user's information
 *******************/
app.get('/change_user', function(req, res) {
    var errObj = {
        error: null
    }
    console.log('this is my req.query', req.query);
    connection.query('SELECT `username` FROM `users`', function(error, results) {
        for (var i = 0, len = results.length; i < len; i++) {

            if (results[i]['username'] == req.query['nameChange']) {
                errObj['error'] = 'Username already taken';
                res.send(errObj);
            } else {
                connection.query('UPDATE `users` SET username="' + req.query[
                    'nameChange'] + '" WHERE id=' + req.query['id'] + ';', function(error, results, fields) {
                    if (error) {
                        res.send(error);
                    } else {
                        res.send(errObj);
                    }
                });
            }
        }
    });
});


/*********************************************
 * This function gets all relevant information associated with the users
 * playlists and dumps it on the client side. Promises are used to make sure
 * that all calls to the Spotify API are complete before sending back information
 *
 * @req Spotify ID and access token
 * @res Playlist Data associated with user's account. This includes URI's, album and artist images urls,
 * and names. All data is strings.
 **********************************************/
app.get('/get_playlists', function(req, res) {
    console.log("this is my request query", req.query);

    var authOptions = {
        url: 'https://api.spotify.com/v1/users/' + req.query.spotify_id + '/playlists',
        headers: {
            'Authorization': 'Bearer ' + req.query.access_token
        },
        json: true,
    }
    request.get(authOptions, function(error, response, body) {
        var sendBackData = [];
        var defer = Q.defer();
        var requestAmount = body.items.length;
        for (var index in body.items) {

            var item = body.items[index];
            (function(_item) {
                var playlistData = {
                    name: '',
                    p_uri: '',
                    tracks: []
                };

                playlistData.name = item.name;
                playlistData.p_uri = item.uri;
                if (_item && _item.href) {
                    authOptions['url'] = _item.href;
                    request.get(authOptions, function(error, response, body) {
                        if (error) {
                            requestAmount--;
                            defer.reject(error);
                        } else {
                            var tracks = body['tracks']['items'];

                            for (var i = 0; i < tracks.length; i++) {
                                var track_info = {
                                    name: '',
                                    uri: '',
                                    img: '',
                                    artist: '',

                                };
                                track_info['name'] = tracks[i]['track']['name'];
                                track_info['uri'] = tracks[i]['track']['uri'];
                                track_info['img'] = tracks[i]['track']['album']['images'][1]['url'];
                                track_info['artist'] = tracks[i]['track']['artists'][0]['name'];
                                playlistData['tracks'].push(track_info);
                            }
                            sendBackData.push(playlistData);

                            if (sendBackData.length == requestAmount) {
                                defer.resolve(sendBackData);
                            }
                        }
                    });
                } else {
                    requestAmount--;
                    console.error("Href or playlist doesn't exist");
                    defer.reject(error);
                }

            })(item)

        }

        defer.promise.then(function(data) {
            console.log("we got it : ", data.length);
            res.send(data);
        }).catch(function(error) {
            console.error("error with API", error);
            res.send(error);
        });

    })



});


console.log('Listening on 8888');
app.listen(8888);