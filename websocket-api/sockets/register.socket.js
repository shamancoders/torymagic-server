module.exports = (socket, osInfo) => {
	// socket.emit('message','test message')
	// socket.disconnect()
	// 		purgeSocket(socket)
	// 		return 

	connectorHelper.newId(socket.conn.remoteAddress, osInfo)
		.then(connDoc => {
			socket.emit('registered',{id:connDoc.id,password:connDoc.password})
		})
		.catch(err => {
			socket.disconnect()
			purgeSocket(socket)
		})
}
