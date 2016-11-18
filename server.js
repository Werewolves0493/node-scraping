//----------------------------------------------------------------------------------------------------------------------
//                                                Load Moduels
//----------------------------------------------------------------------------------------------------------------------
var http   			= require("http");
var express			= require("express");
var bodyParser		= require('body-parser');
var path 			= require('path');
var config 			= require('./config/config');
var session			= require('express-session');
var cookieParser	= require('cookie-parser');
var mongoose        = require('mongoose');
//----------------------------------------------------------------------------------------------------------------------
//                                                 Setting
//----------------------------------------------------------------------------------------------------------------------
var app = express();
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.set('port', config.APP_PORT);

//app.use(morgan('tiny'));    // log every request to the console
app.use(cookieParser());
app.use(session({secret: 'liadscrapping', resave: true, saveUninitialized: true})); // session secret
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

mongoose.connect(config.dbUrl);
//----------------------------------------------------------------------------------------------------------------------
//                                                 Define Route
//----------------------------------------------------------------------------------------------------------------------
require('./crawler/dashboard')(app);

var httpServer = http.createServer(app).listen(config.APP_PORT, function() {
	console.log('Express server listening on port ' + app.get('port'));
});

