
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  , http = require('http')
  , passport = require('passport')
  , mongoose = require('mongoose')
  , nodemailer = require("nodemailer")
  , LocalStrategy = require('passport-local').Strategy
  , MongoStore = require('connect-mongo')(express)
  , jade_browser = require('jade-browser')
  , crypto = require('crypto')
  , path = require('path')

//settings
var settings = require("./settings");

//db schemas
db = mongoose.createConnection(settings.connection.host, settings.connection.db);
var User = require("./lib/User");

//email
nodemailer.SMTP = {
	host: settings.mail_host
} 

//utils
function hashPassword(password){
	return crypto.createHash("sha1").update(password + settings.password_salt).digest("hex");
}

function hashMatch(hash, password){
	return hashPassword(password) === hash;
}


var sessionStore = new MongoStore({db:settings.connection.db});

var app = express();

passport.use(new LocalStrategy({
		usernameField: 'username',
		passwordField: 'password',
		passReqToCallback: true
	},
	function(req, username, password, done) {
		var hashed_password = hashPassword(password);
		User.findOne({username:username, password:hashed_password}, function(err, user){
			if(err) throw err;
			if(!user){
				return done(null, false, {msg: "Incorrect login details"});
			}
			done(null, user);
		});
	}
));

function authenticate(req,res,next){
  if (req.isAuthenticated()) { return next(); }
  if (req.xhr){
 	 return res.json({error:"authentication failed"});
  }else{
  	return res.redirect('/');
  }
}

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(id, done) {
  done(null, id);
});


app.configure(function(){
	app.set('port', process.env.PORT || 3051);
	app.set('views', __dirname + '/views');
	app.set('view engine', 'jade');
	app.use(express.favicon());
	app.use(express.logger('dev'));
	app.use(express.cookieParser(settings.cookie));
	app.use(express.bodyParser());
	app.use(express.methodOverride());
	app.use(jade_browser('/templates.js', '**', {root: __dirname + '/views/components', cache:false}));	  
	app.use(express.session({ secret: settings.cookie, store: sessionStore, cookie: { maxAge: 1000 * 60 * 60 * 7 * 1000 ,httpOnly: false, secure: false}}));
	app.use(passport.initialize());
	app.use(passport.session());
	app.use(function(req,res,next){
		res.locals.user = req.user;
		next();
	});
	app.use(function noCachePlease(req, res, next) {
		res.header("Cache-Control", "no-cache, no-store, must-revalidate");
		res.header("Pragma", "no-cache");
		res.header("Expires", 0);
		next();
	});
	app.use(express.session());
	app.use(app.router);
	app.use(require('stylus').middleware(__dirname + '/public'));
	app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});
app.get('/logout', function(req, res){
	req.logout();
	req.session.destroy();
	res.redirect('/');
});
app.post(
	'/login',
	passport.authenticate('local', {
		successRedirect:'/',
		failureRedirect:'/'
	})
);
app.post('/register', /*Authenticate, */ function(req, res){
	var username = req.body.username;
	var fullname = req.body.fullname;
	var password = "welcome";
	var type = req.body.type;
	if(fullname == "" || !fullname || username == "" || !username || password == "" || !password){
		return res.json({error:"unable to register"});
	}
	if(!type){
		type = "normal";
	}
	var password_hashed = hashPassword(password);
	User.exists(username, function(exists){
		if(exists == true){
			return res.json({error:"already registered"});
		}
		var user = new User({
			username:username, 
			password:password_hashed,
			type:type,
			registered_date: new Date()
		});
		user.save(function(err, user){
			if(err) throw err;
			res.json({success:"registered"});
		});
	});
});
app.get('/', function(req,res){
	if (req.isAuthenticated()) {
		res.render('index');
	}else{
		res.render('login');
	}
});


http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});
