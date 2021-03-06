
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , http = require('http')
  , passport = require('passport')
  , mongoose = require('mongoose')
  , nodemailer = require("nodemailer")
  , LocalStrategy = require('passport-local').Strategy
  , MongoStore = require('connect-mongo')(express)
  , jade_browser = require('jade-browser')
  , crypto = require('crypto')
  , path = require('path')
  , _ = require('underscore')
  , racker = require('racker')
  , async = require('async')
  , fs = require('fs')
  , moment = require('moment')
  , request = require('request')
  //, formidable = require('formidable')
  //, request = require('superagent')



//settings
var settings = require("./settings");
cdn_url = settings.rackspace.cdn_url;

//db schemas
db = mongoose.createConnection(settings.connection.host, settings.connection.db);
var User = require("./lib/User");
var File = require("./lib/File");

//rackspace
racker
.set('user', settings.rackspace.user)
.set('key', settings.rackspace.key);

//email
nodemailer.SMTP = {
	host: settings.mail.host
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
    app.use(express.compress());
  	app.use(express.cookieParser(settings.cookie));
	app.use(express.limit(settings.max_upload_size));
	app.use(express.bodyParser({ uploadDir: settings.save }));
	//app.use(express.json());
	//app.use(express.urlencoded());
	//app.use(express.multipart()); // Remove this line
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
	var email = req.body.email;
	var password = "welcome";
	var type = req.body.type;
	if(fullname == "" || !fullname || username == "" || !username || email == "" || !email){
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
			email:email, 
			username:username, 
			fullname:fullname,
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
		var query = req.user.type == 'normal' ? {user:req.user._id} : {};
		File
		.find(query,{ip:0, __v:0})
		.populate('user', '_id username')		
		.sort({date:-1})
		.exec(function(err, batch){
			if(err) throw err;
			batch = JSON.parse(JSON.stringify(batch));
			for(var i=0; i<batch.length; i++){
				batch[i].date = moment(batch[i].date).fromNow();
				for(var f = 0; f<batch[i].files.length; f++){
					batch[i].files[f].url = cdn_url + "/" + batch[i].files[f].file
				}
			}
			res.render('index', {batch:batch});
		});
	}else{
		res.render('login');
	}
});
app.post('/search', authenticate, function(req,res){
	if(!req.body.q){
		return res.status(502).json({error:'incorrect request'});
	}
	var q, search;
	q = new RegExp(req.body.q, 'gi');
	if(req.user.type == 'administrator'){
		//check if the pattern matches username/1234
		var match = req.body.q.match(/\w*\/\d/i);
		if(match){
			match = match[0];
			var split = match.split("/");
			search = {batch:parseInt(split[1]), username:new RegExp(split[0], 'gi')};
			console.log(search);
		}else{
			search = {tags:q}
		}
	}else{
		search = {tags:q, user:req.user._id};
	}
	File
	.find(search,{ip:0, __v:0})
	.populate('user', '_id username')	
	.limit(15)	
	.sort({date:-1})
	.exec(function(err, batch){
		if(err) throw err;
		res.json(batch);
	});
});
app.post('/upload', authenticate, function(req,res){
	console.log(req.form);
	var files = [];
	var ip = req.ip;
	var date = new Date();
	var user = req.user._id;
	var tags = req.body.tags;
	var _files = _.keys(req.files);
	async.eachLimit(
		_files,
		4,
		function(file, done){
		
			var f = {};
			f.path = req.files[file].path;
			f.file = f.path.split("/")[1];
			f.name = req.files[file].name;
			f.size = req.files[file].size;
			console.log(f);
			files.push(f);
			racker
			.upload(fs.createReadStream(f.path))
			.to('aasandha uploads')
			.as(f.file)
			.on('progress', console.log)
			.end(function(){
				fs.unlink(f.path, function(){});
				done(null, null);
			});		
		},
		function(){
			//find batch of user
			File
			.findOne({user:user})
			.sort({batch:-1})
			.exec(function(err, file){
				if(err) throw err;
				var batch;
				if(!file){
					batch = 1;
				}else{
					batch = file.batch + 1;
				}
				var f = new File({files:files, tags:tags, batch:batch, username:req.user.username, user:user, ip:ip, date:date})
				.save(function(err, batch){
					if(err) throw err;
					File
					.find({_id:batch._id},{ip:0, __v:0})
					.populate('user', '_id username')
					.exec(function(err, batch){		
						batch = JSON.parse(JSON.stringify(batch));
						for(var i=0; i<batch.length; i++){
							batch[i].date = moment(batch[i].date).fromNow();
						}
						console.log(batch);
						res.json(batch[0]);
					});
					//send mail
					var html = [
						"<h3>You have shared the following files with Allied Insurance, please login to view the files</h3>",
						"<h4>Batch: " + req.user.username + "/" + batch.batch + "</h4>",
						"<h4>Files:</h4>",
						_.map(files, function(f){
							return "<li>"+f.name+"</li>"; 
						}).join(""),
						"<p>To view files please visit <a href='https://uploader.alliedmaldives.net'>https://uploader.alliedmaldives.net</a></p>"
					].join("");
					nodemailer.send_mail({
						sender: settings.mail.from,
						to: req.user.email,
						bcc: settings.mail.bcc,
						subject:"[uploader] files shared successfully",
						html: html,
						body:''			
					}, function(error, success){
						if(error) return res.json({error:'email failed'});
					});
				});
			});
		
		}
	);

});

app.get('/download/:folder/:file', authenticate, function(req, res){
	var fname = req.params.folder;
	var file = cdn_url + "/" + fname;
	if(req.user.type == 'administrator'){
		if(settings.cache){
			//check if file exist in cache
			var cached = path.normalize(__dirname + "/" + settings.cache + fname);
			return fs.exists(cached, function(exists){
				if(exists){
					console.log('downloading local cached version');
					fs.createReadStream(cached).pipe(res);
				}else{
					request.get(file).pipe(res);
				}
			});
		}else{
			return request.get(file).pipe(res);
		}
	}
	//if normal user
	//check if file belongs to user
	File.count({user:req.user._id, 'files.file':req.params.folder}, function(err, count){
		if(err) throw err;
		if(count == 0){
			res.status(502).end("<h1>You're not authorized to download this file!</<h1>");
		}else{
			if(settings.cache){
				//check if file exist in cache
				var cached = path.normalize(__dirname + "/" + settings.cache + fname);
				console.log(cached);
				return fs.exists(cached, function(exists){
					if(exists){
						console.log('downloading local cached version');
						fs.createReadStream(cached).pipe(res);
					}else{
						request.get(file).pipe(res);
					}
				});
			}else{
				return request.get(file).pipe(res);
			}
		}
	});
});


http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});
