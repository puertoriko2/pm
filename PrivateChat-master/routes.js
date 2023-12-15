var gravatar = require('gravatar');

module.exports = function(app, io){

	app.get('/', function(req, res){
		res.render('home');
	});

	app.get('/create', function(req,res){
		var id = Math.round((Math.random() * 1000000));
		res.redirect('/chat/'+id);
	});

	app.get('/chat/:id', function(req,res){
		res.render('chat');
	});

	var chat = io.on('connection', function (sockets) {
		
		sockets.on('load',function(data){

			var room = findClientsSocket(io, data);
			if(room.length === 0 ) {

				sockets.emit('peopleinchat', {number: 0});
			}
			else if(room.length === 1) {

				sockets.emit('peopleinchat', {
					number: 1,
					user: room[0].username,
					avatar: room[0].avatar,
					id: data
				});
			}
			else if(room.length >= 2) {

				chat.emit('tooMany', {boolean: true});
			}
		});
		sockets.on('login', function(data) {

			var room = findClientsSocket(io, data.id);
			if (room.length < 2) {
				sockets.username = data.user;
				sockets.room = data.id;
				sockets.avatar = gravatar.url(data.avatar, {s: '140', r: 'x', d: 'mm'});

				sockets.emit('img', sockets.avatar);
				sockets.join(data.id);

				if (room.length == 1) {
					var usernames = [],
						avatars = [];
					usernames.push(room[0].username);
					usernames.push(sockets.username);

					avatars.push(room[0].avatar);
					avatars.push(sockets.avatar);
					
					chat.in(data.id).emit('startChat', {
						boolean: true,
						id: data.id,
						users: usernames,
						avatars: avatars
					});
				}
			}
			else {
				sockets.emit('tooMany', {boolean: true});
			}
		});

		sockets.on('disconnect', function() {
			sockets.broadcast.to(this.room).emit('leave', {
				boolean: true,
				room: this.room,
				user: this.username,
				avatar: this.avatar
			});
			// leave the room
			sockets.leave(sockets.room);
		});

		sockets.on('msg', function(data){
			sockets.broadcast.to(sockets.room).emit('receive', {msg: data.msg, user: data.user, img: data.img});
		});
	});
};

function findClientsSocket(io, roomId, namespace) {
	var res = [],
		ns = io.of(namespace ||"/");
	if (ns) {
		for (var id in ns.connected) {
			if(roomId) {
				var index = ns.connected[id].rooms.toString().indexOf(roomId);
				if(index !== -1) {
					res.push(ns.connected[id]);
				}
			}
			else {
				res.push(ns.connected[id]);
			}
		}
	}
	return res;
}
