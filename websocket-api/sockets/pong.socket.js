module.exports = (socket) => {
	socket.clientInfo.lastPong=new Date()
	socket.emit('pong')
}
