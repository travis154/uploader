$(function(){
	$("#files").on("change", function(){
		var self = this;
		var files = _.map(self.files, function(file){
			return {name:file.name, size:file.size}
		});
		$("#display").html(jade.render('display-files', {files:files}));
	});
	$("#search").on('keyup', function(e){
		var code = e.keyCode;
		if(e.keyCode != 13) return;
		var val = $("#search").val();
		$.post('/search',{q:val}, function(res){
			$("#files-listing").html('');
			res.forEach(function(b){
				b.date = moment(b.date).fromNow()
				$("#files-listing").prepend(jade.render('file-listing', {item:b}));
			});
		});
	});
	$("body").on("click", "#upload", function(){
		var self = $(this);
		var form = new FormData();
		var files = $("#files").get(0).files;
		try{
			if(!files.length){
				return alert('no files selected');
			}
			if(files.length > 10){
				return alert("Maximum 10 files are allowed in a batch");
			}
			for(var i=0; i<files.length; i++){
				var file = files[i];
				if(file.size > 1024*1024*10){
					return alert("Maximum file size per file is 10mb");
				}
				form.append(file.name, file);
			}
			form.append("tags", $("#tags").val());
			self.attr('disabled', 'disabled');
			var xhr = new XMLHttpRequest();
			xhr.open('POST','/upload');
			var progressBar = document.querySelector('#uploading-value');
			xhr.setRequestHeader('Accept', 'application/json');
			xhr.upload.onprogress = function(e) {
				if (e.lengthComputable) {
					console.log(e.loaded,e.total);
					progressBar.innerHTML = (((e.loaded / e.total) * 100) << .1) + "%";
				}
				if(e.loaded ===  e.total){
					progressBar.innerHTML = "wait"
				}
			};
			xhr.onreadystatechange = function(){
				if(xhr.readyState == 4 && xhr.status == 200){
					self.removeAttr('disabled');
					try{
						var res = JSON.parse(xhr.responseText);
						if(res.error){
							alert(res.error);
						}else{
							$("#file-listing-uploading").slideUp();
							var html = $(jade.render('file-listing', {item:res}));
							$("#files-listing").prepend(html);
							html.trigger('click');
						}
					}catch(e){
						console.log(e);
					}
				}else{
					//alert("Unable to upload");
					console.log(xhr);
					//window.location.reload(true);
				}
			}
			$("#file-listing-uploading").slideDown();
			xhr.send(form);
		}catch(e){
			console.log(e.toString());
		}
	});
	$("body").on('click', '.file-listing', function(){
		$(".file-listing").removeClass("active");
		$(this).addClass("active");
		var data = $(this).data().data;
		$("#display").html(jade.render('display-files-uploaded', {files:data.files}));
	});
	$("#newuser_create").click(function(){
		var fullname = $("#newuser_realname").val();
		var username = $("#newuser_username").val();
		var email = $("#newuser_email").val();
		if(fullname == "" || username == "" || email == ""){
			return alert("please fill name, username and email");
		}
		var type = $("#newuser_type button.active").text().toLowerCase();
		superagent
		.post('/register')
		.send({fullname:fullname, username:username, email:email, type:type})
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

