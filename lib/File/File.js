var mongoose = require('mongoose');
var User = require('../User');    
exports.Schema = mongoose.Schema(
		{
			files:[{file:{type:'string'}, name:{type:'string'}, size:{type:'number'}, path:{type:'string'}}],
			tags:'string',
			batch:{type:'number'},
			username:'string',
			user:{type:mongoose.Schema.Types.ObjectId, ref:'users'},
			ip:'string',
			date:'date',
			url:'string'
		},
		{
			strict:false
		}
	);

exports.Schema.statics = {
}
