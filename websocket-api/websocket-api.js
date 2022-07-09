module.exports = function (httpServer) {
	return new Promise((resolve, reject) => {
		if (!httpServer)
			return reject('httpServer not defined')

		let pingInterval = global.config.websocketApi.pingInterval || 5000

		let moduleHolder = socketModuleLoader(path.join(__dirname, 'sockets'), '.socket.js')

		let socketCorsDomainList = global.config.websocketApi.socketCorsDomainList || []

		global.io = require('socket.io')(httpServer, {
			rejectUnauthorized: false,
			autoConnect: true,
			maxHttpBufferSize: 1e8,
			pingTimeout: 60000,
			cors: {
				origin: function (origin, callback) {
					return callback(null, true)
				}
			}
		})

		global.socketClients = {}

		io.of(global.config.websocketApi.namespace || '')
			.on('connection', socket => {
				let domain = socket.request.headers['origin'] || socket.request.headers['referer'] || ''
				domain = (domain || '').replace('https://', '').replace('http://', '').split(':')[0].split('/')[0]
				if (domain == '127.0.0.1') {
					domain = 'localhost'
				}
				let newUuid = uuid.v4()
				socket.domain = domain
				socket.uuid = newUuid
				socket.pingIntervalId = null
				socket.timeIntervalId = null

				socket.subscribed = false
				socket.clientInfo = {
					uuid: newUuid,
					_id: '',
					id: '',
					password: '',
					IP: socket.conn.remoteAddress,
					startTime: new Date(),
					lastPong: new Date(),
					endTime: new Date()
				}

				socket.pingIntervalId = setInterval(() => {
					let fark = (new Date()).getTime() - socket.clientInfo.lastPong.getTime()
					if (fark > (pingInterval + 2000)) {
						purgeSocket(socket)
						logTotalClients()
					} else {
						socket.emit('ping')
					}
				}, pingInterval)

				global.socketClients[newUuid] = socket

				global.socketTotalConnected++
				logTotalClients()

				// socket.timeIntervalId = setInterval(() => {
				// 	if (socket && socket.subscribed) {
				// 		let t = new Date()
				// 		socket.emit('time', {
				// 			utcNow: t.toISOString().replace('Z', '+00:00'),
				// 			time: t.getTime(),
				// 			server: t.yyyymmddhhmmss(),
				// 			timeOffset: t.getTimezoneOffset() * -1
				// 		})
				// 	}
				// }, 1000)

				socket.on('disconnect', () => {
					if (socket && socket.uuid && socketClients[socket.uuid]) {
						socketClients[socket.uuid] = undefined
						delete socketClients[socket.uuid]
						console.log(`disconnected :`, socket.uuid)
						logTotalClients()
					}
				})

								
				Object.keys(moduleHolder).forEach((key) => {
					socket.on(key, (...placeholders) => {
						try {
							moduleHolder[key](socket, ...placeholders)
						} catch (err) {
							errorLog('[WebsocketAPI]'.cyan, key.green, err.name, err.message)
						}
					})
				})
				
				
			})

		eventLog(`[WebsocketAPI]`.cyan, 'started')
		resolve()
	})
}


global.purgeSocket = (socket) => {
	clearInterval(socket.pingIntervalId)
	clearInterval(socket.timeIntervalId)

	delete global.socketClients[socket.uuid]

	clean(socket)
}

function socketModuleLoader(folder, suffix) {
	let holder = {}
	try {

		let files = fs.readdirSync(folder)
		files.forEach((e) => {
			let f = path.join(folder, e)
			if (!fs.statSync(f).isDirectory()) {
				let fileName = path.basename(f)
				let apiName = fileName.substr(0, fileName.length - suffix.length)
				if (apiName != '' && (apiName + suffix) == fileName) {
					holder[apiName] = require(f)
				}
			}
		})

	} catch (err) {
		errorLog(`[WebsocketAPI]`.cyan, 'socketModuleLoader'.green, err)
		process.exit(1)
	}
	return holder
}

function logTotalClients() {
	eventLog(`Total connected socket clients:`, Object.keys(socketClients).length)
}
