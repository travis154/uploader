var moment = require('moment');    
var _ = require('underscore');
function compute(){
	User
	.find({featured:true})
	.lean()
	.exec(function(err, users){
		if(err) throw err;
		//20 posts from users
		var users = _.pluck(users, '_id');
		console.log(users);
	});
}

setInterval(compute, 1000 * 60 * 60 * 1);
compute();
