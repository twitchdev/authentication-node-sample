/*
Copyright 2017 Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance with the License. A copy of the License is located at

    http://aws.amazon.com/apache2.0/

or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

*/

// Define our dependencies
var express        = require('express');
var session        = require('express-session');
var passport       = require('passport');
var OAuth2Strategy = require('passport-oauth').OAuth2Strategy;
var request        = require('request');
var handlebars     = require('handlebars');

// Define our constants, you will change these with your own
const TWITCH_CLIENT_ID = '<YOUR CLIENT ID HERE>';
const TWITCH_SECRET    = '<YOUR CLIENT SECRET HERE>';
const SESSION_SECRET   = '<SOME SECRET HERE>';
const CALLBACK_URL     = '<YOUR REDIRECT URL HERE>';  // You can run locally with - http://localhost:3000/auth/twitch/callback

// Initialize Express and middlewares
var app = express();
app.use(session({secret: SESSION_SECRET, resave: false, saveUninitialized: false}));
app.use(express.static('public'));
app.use(passport.initialize());
app.use(passport.session());

// Override passport profile function to get user profile from Twitch API
OAuth2Strategy.prototype.userProfile = function(accessToken, done) {
  var options = {
    url: 'https://api.twitch.tv/helix/users',
    method: 'GET',
    headers: {
      'Client-ID': TWITCH_CLIENT_ID,
      'Accept': 'application/vnd.twitchtv.v5+json',
      'Authorization': 'Bearer ' + accessToken
    }
  };

  request(options, function (error, response, body) {
    if (response && response.statusCode == 200) {
      done(null, JSON.parse(body));
    } else {
      done(JSON.parse(body));
    }
  });
}

passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(user, done) {
    done(null, user);
});

passport.use('twitch', new OAuth2Strategy({
    authorizationURL: 'https://id.twitch.tv/oauth2/authorize',
    tokenURL: 'https://id.twitch.tv/oauth2/token',
    clientID: TWITCH_CLIENT_ID,
    clientSecret: TWITCH_SECRET,
    callbackURL: CALLBACK_URL,
    state: true
  },
  function(accessToken, refreshToken, profile, done) {
    profile.accessToken = accessToken;
    profile.refreshToken = refreshToken;

    // Securely store user profile in your DB
    //User.findOrCreate(..., function(err, user) {
    //  done(err, user);
    //});

    done(null, profile);
  }
));

// Set route to start OAuth link, this is where you define scopes to request
app.get('/auth/twitch', passport.authenticate('twitch', { scope: 'user_read' }));

// Set route for OAuth redirect
app.get('/auth/twitch/callback', passport.authenticate('twitch', { successRedirect: '/', failureRedirect: '/' }));

// Define a simple template to safely generate HTML with values from user's profile
var template = handlebars.compile(`
<html><head><title>Twitch Auth Sample</title></head>
<table>
    <tr><th>Access Token</th><td>{{accessToken}}</td></tr>
    <tr><th>Refresh Token</th><td>{{refreshToken}}</td></tr>
    <tr><th>Display Name</th><td>{{display_name}}</td></tr>
    <tr><th>Bio</th><td>{{bio}}</td></tr>
    <tr><th>Image</th><td>{{logo}}</td></tr>
</table></html>`);

// If user has an authenticated session, display it, otherwise display link to authenticate
app.get('/', function (req, res) {
  if(req.session && req.session.passport && req.session.passport.user) {
    res.send(template(req.session.passport.user));
  } else {
    res.send('<html><head><style>.container { position: relative; width: 350px; height: 350px; background-color: #6441a5; -moz-border-radius: 20px; -ms-border-radius: 20px; -o-border-radius: 20px; -webkit-border-radius: 20px; border-radius: 20px; -webkit-transition: all 0.5s; -moz-transition: all 0.5s; -o-transition: all 0.5s; transition: all 0.5s; } .container:hover { background-color: #7550b9; } .logo { position: absolute; left: 50px; top: 50px; border: 20px solid white; width: 190px; height: 170px; border-left: 39px solid white; border-bottom: 39px solid white; } .logo:before { content: ""; position: absolute; left: -39px; top: -20px; height: 0px; width: 0px; border-left: 18px solid  #6441a5; border-bottom: 45px solid white; -webkit-transition: all 0.5s; -moz-transition: all 0.5s; -o-transition: all 0.5s; transition: all 0.5s; } .container:hover > .logo:before{ border-left: 18px solid #7550b9; } .logo:after { content: ""; position: absolute; bottom: -40px; right: -20px; height: 0px; width: 0px; border-right: 69px solid #6441a5; border-top: 69px solid transparent; -webkit-transition: all 0.5s; -moz-transition: all 0.5s; -o-transition: all 0.5s; transition: all 0.5s; } .container:hover > .logo:after{ border-right: 69px solid #7550b9; } .left-tick { position: absolute; left: 66px; top: 45px; width: 21px; height: 69px; background: white; } .right-tick { position: absolute; left: 129px; top: 45px; width: 21px; height: 69px; background: white; } .bottom-right { position: absolute; height: 0px; width: 0px; bottom: 0px; right: 0px; border-right: 39px solid white; border-top: 39px solid transparent; } .purple-quote { position: absolute; height: 0px; width: 0px; bottom: -36px; left: 54px; border-right: 36px solid transparent; border-top: 36px solid #6441a5; -webkit-transition: all 0.5s; -moz-transition: all 0.5s; -o-transition: all 0.5s; transition: all 0.5s; } .container:hover > .logo > .purple-quote{ border-top: 36px solid #7550b9; } .white-quote { position: absolute; left: 27px; bottom: -75px; width: 69px; height: 36px; background: white; } .white-quote:before { content: ""; position: absolute; bottom: 0px; left: 33px; border-right: 36px solid #6441a5; border-top: 36px solid white; -webkit-transition: all 0.5s; -moz-transition: all 0.5s; -o-transition: all 0.5s; transition: all 0.5s; } .container:hover > .logo > .white-quote:before { border-right: 36px solid #7550b9; }</style><title>Twitch Auth Sample</title></head><a href="/auth/twitch"><div class="container"> <div class="logo"> <div class="bottom-right"> </div> <div class="purple-quote"> </div> <div class="white-quote"> </div> <div class="left-tick"> </div> <div class="right-tick"> </div> </div> </div></a></html>');
  }
});

app.listen(3000, function () {
  console.log('Twitch auth sample listening on port 3000!')
});
