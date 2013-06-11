$(function(){
	$("#files").on("change", function(){
		var self = this;
		var files = _.map(self.files, function(file){
			return {name:file.name, size:((file.size / 1024) << .1)}
		});
		$("#display").html(jade.render('display-files', {files:files}));
	});
	
	$("body").on("click", "#upload", function(){
		var self = $(this);
		var form = new FormData();
		var files = $("#files").get(0).files;
		if(!files.length){
			return alert('no files selected');
		}
		for(var i=0; i<files.length; i++){
			var file = files[i];
			form.append(file.name, file);
		}
		self.attr('disabled', 'disabled');
		var xhr = new XMLHttpRequest();
		xhr.open('POST','/upload');
		var progressBar = document.querySelector('#uploading-value');
		xhr.setRequestHeader('Accept', 'application/json');
		xhr.upload.onprogress = function(e) {
			if (e.lengthComputable) {
				progressBar.innerHTML = (((e.loaded / e.total) * 100) << .1) + "%";
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
					}
				}catch(e){
					console.log(e);
				}
			}
		}
		$("#file-listing-uploading").slideDown();
		xhr.send(form);
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

