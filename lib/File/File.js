var mongoose = require('mongoose');
exports.Schema = mongoose.Schema(
		{
			files:[{file:{type:'string'}, size:{type:'number'}, path:{type:'string'}}],
			batch:{type:'number'},
			user:{user:{type:mongoose.Schema.Types.ObjectId}},
			ip:'string',
			date:'date'
		},
		{
			strict:false
		}
	);

exports.Schema.statics = {
}
