var mongoose = require('mongoose');
exports.Schema = mongoose.Schema(
		{
			username:{type:'string', required:true},
			fullname:'string',
			email:'string',
			password:{type:'string', required:true},
			type:{type:'string', required:true},
			registered_date:'date'
		},
		{
			strict:false
		}
	);

exports.Schema.statics = {
	exists:function(username, fn){
		this.count({username:username}, function(err, count){
			if(err) throw err;
			fn(count > 0);
		});
	}
}
