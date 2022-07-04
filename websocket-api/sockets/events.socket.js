module.exports = (socket, provider) => {
	if (socket.subscribed) {
		if (!socket.logEvents) {
			socket.logEvents = true
			let filter = {}
			if (provider) {
				filter.provider=provider
			}
			db.providerLogs.find(filter).sort({ _id: -1 }).limit(50)
				.then(docs => {
					docs.reverse().forEach(e => {
						let logObj = {
							provider: e.provider,
							type: e.type,
							time: e.time,
							code: e.code,
							message: e.message
						}
						socket.emit('events', logObj)
					})
				})
				.catch(err => socket.emit('error', err))
		}

	} else {
		socket.emit('error', 'Authentication failed')
	}
}

