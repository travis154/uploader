$(function(){
	$("#files").on("change", function(){
		var self = this;
		var files = _.map(self.files, function(file){
			return {name:file.name, size:((file.size / 1024) << .1)}
		});
		$("#display").html(jade.render('display-files', {files:files}));
	});
	
	$("body").on("click", "#upload", function(){
		var form = new FormData();
		var files = $("#files").get(0).files[0];
		form.append(files, files.name)
		superagent
		.post('/upload')
		.field(files, files.name)
		.end(console.log)
	});
	$("#newuser_create").click(function(){
		var fullname = $("#newuser_realname").val();
		var username = $("#newuser_username").val();
		if(fullname == "" || username == ""){
			return alert("please fill name and username");
		}
		var type = $("#newuser_type button.active").text().toLowerCase();
		superagent
		.post('/register')
		.send({fullname:fullname, username:username, type:type})
		.set('Accept', 'application/json')
		.end(function(err, res){
			var resp = res.body;
			if(resp.error){
				alert(resp.error);
			}else{
				window.location.reload(true);
			}
		});
	});
});

