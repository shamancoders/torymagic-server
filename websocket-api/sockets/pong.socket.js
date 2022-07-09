module.exports = (socket) => {
	socket.clientInfo.lastPong=new Date()
	socket.clientInfo.IP=socket.conn.remoteAddress
	db.connectors.update({
		_id:socket.clientInfo._id
	},{
		$set:{
			lastOnline:socket.clientInfo.lastPong,
			lastIP:socket.clientInfo.IP,
			lastUuid:socket.uuid
		}
	},
	{multi:false})
	socket.emit('pong')
}
