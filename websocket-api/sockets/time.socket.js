module.exports = (socket) => {
	if(!socket.subscribed)
		return socket.emit('error', 'Get subscribed first')

	socket.timeIntervalId = setInterval(() => {
		if(socket)
			socket.emit('time', { "utcNow": (new Date()).toISOString().replace('Z', '+00:00') })
	}, 1000)

}