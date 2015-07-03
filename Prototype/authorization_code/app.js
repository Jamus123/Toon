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
    user: 'admin',
    password: 'Di$1smYp@$Sw0rD',
    port: 3306,
    database: 'fp_test'
});

connection.connect(function(err) {
    if (err) {
        console.error('error connecting: ' + err.stack);
        return;
    }

    console.log('connected as id ' + connection.threadId);
});


var client_id = '9b2a0f5b21e54841854ffda54e619b2c'; //client id
var client_secret = '518f6bfb73be4dd4a4aefcc0a75fe800'; //client secret
var redirect_uri = 'http://localhost:8888/callback'; //redirect urigit

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



var stateKey = 'spotify_auth_state';

var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);

server.listen(1234);


/*********************************************
 *
 **********************************************/
io.on('connection', function(socket) {
    socket.emit('news', {
        hello: 'world'
    });
    socket.on('my other event', function(data) {
        console.log(data);
    });
});


/*********************************************
 *
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
 *
 **********************************************/
app.get('/login', function(req, res) {

    var state = generateRandomString(16);
    res.cookie(stateKey, state);

    // your application requests authorization
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
 *
 **********************************************/
app.get('/callback', function(req, res) {
    // console.log(req);
    // your application requests refresh and access tokens
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
                id: ''
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
                        var getIdQuery = 'SELECT `id` FROM `users` WHERE `spotify_id` = ' + body.id;
                        if (results.length != 0) {
                            console.log("this user already exists");
                            connection.query(getIdQuery, function(error, results, fields) {
                                tokenAndId['id'] = results[0]['id'];
                                console.log("this is my send back data after DB query", tokenAndId)
                                defer.resolve(tokenAndId);
                            });
                        } else {
                            var setUserQuery = 'INSERT INTO `users` (`spotify_id`) VALUES (' + body.id + ');';
                            connection.query(setUserQuery, function(){
                                connection.query(getIdQuery, function(error, results, fields) {
                                    tokenAndId['id'] = results[0]['id'];
                                    console.log("this is data after adding to DB", tokenAndId);
                                    defer.resolve(tokenAndId);
                                });
                            });

                        }
                    });

                });

                // we can also pass the token to the browser to make requests from there
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
 *
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
 * Currently the users info from the database but later this 
 *  call will be user to change the user's information
 *******************/
app.get('/change_user', function(req, res) {
    console.log('this is my req.query', req.query);
    connection.query('UPDATE * FROM `users`', function(error, results, fields) {
        res.send();
    });
});


/*********************************************
 *
 **********************************************/
app.get('/get_playlists', function(req, res) {

    var trak_url;
    var authOptions = {
        url: 'https://api.spotify.com/v1/users/' + req.query.user_id + '/playlists',
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
                            console.log(tracks);
                            for (var i = 0; i < tracks.length; i++) {
                                var track_info = {
                                    name: '',
                                    uri: ''
                                };
                                track_info['name'] = tracks[i]['track']['name'];
                                track_info['uri'] = tracks[i]['track']['uri'];
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
            console.error("error with API");
            res.send(error);
        });

    })



});


console.log('Listening on 8888');
app.listen(8888);


// sendBackData = {playlists:[{
//   playlistName:"pl1",
//   tracks:["track1", "track2"]
// },
// {
//   playlistName:"pl1",
//   tracks:["track1", "track2"]
// ],
// searchName:"asdf"};

// responseData = {
//   success:true,
//   data:sendBackData
// };


// var asdf = function(){
//    var defer = Q.defer();

//    defer.resolve('asdf');

//   return defer.promise;
// }

// var eric = function(promise){

//   promise.then(function(data){
//     console.log("im in eric : ", data);
//   });

//   return false;
// };

// var x = asdf();

// setTimeout(function(){
//   eric(x);
// }, 5000);


// var defer = {
//   isResolved:false,
//   thenFun:null,
//   resolve:function(obj){
//     if(thenFunc){
//       this.thenFunc.apply(this, obj);
//     }
//     isResolved = true;
//   },
//   promise:{
//     then:function(func){
//       this.thenFunc = func;
//       if(isResolved){
//         //call resolved
//       }
//     },
//     catch:function(){

//     }
//   }
// }

// asdf().then(function(dara){

// })
