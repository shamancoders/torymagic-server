module.exports = function(httpServer) {
	return new Promise((resolve, reject) => {
		if(!httpServer)
			return reject('httpServer not defined')

		let pingInterval=config.websocketApi.pingInterval || 18000

		let moduleHolder = socketModuleLoader(path.join(__dirname,'sockets'),'.socket.js')

		let socketCorsDomainList = config.websocketApi.socketCorsDomainList || []

		global.io = require('socket.io')(httpServer, {
			rejectUnauthorized: false,
			autoConnect: false,
			maxHttpBufferSize: 1e8, pingTimeout: 60000,
			cors: {
				origin: function(origin, callback) {
					return callback(null, true)
					// origin = (origin || '').replace('https://', '').replace('http://', '').split(':')[0]

					// if(socketCorsDomainList.includes(origin) || origin.indexOf('localhost') > -1) {
					// 	callback(null, true)
					// } else {
					// 	callback(new Error('Hatali domain erisimi'))
					// }
					
				}
			}
		})

		global.socketClients = {}

		io.on('connection', socket => {
			console.log(socket.request.headers)
			// let domain = socket.request.headers['x-forwarded-host'] || socket.request.headers['x-forwarded-server'] || socket.request.headers['referer'] || ''
			let domain = socket.request.headers['origin'] || socket.request.headers['referer'] || ''
			domain=(domain || '').replace('https://', '').replace('http://', '').split(':')[0].split('/')[0]
			if (domain == '127.0.0.1') {
				domain='localhost'
			}
			let newUuid = uuid.v4()
			socket.domain=domain
			socket.id = newUuid
			socket.pingIntervalId = null
			socket.timeIntervalId = null
			socket.statusIntervalId = null
			socket.subscribed = false
			socket.clientInfo = {
				id: newUuid,
				role: '',
				companyId: '',
				userId: '',
				ipAddress: socket.conn.remoteAddress,
				startTime: new Date(),
				lastPong: new Date(),
				endTime: new Date()
			}

			
			socket.ping=()=>{
				socket.pingIntervalId=setInterval(()=>{
					let fark=(new Date()).getTime() - socket.clientInfo.lastPong.getTime()
					if(fark>(pingInterval+2000)){
						global.latestRates.cleanParasite(socket.id)
						clearInterval(socket.pingIntervalId)
						clearInterval(socket.timeIntervalId)
						clearInterval(socket.statusIntervalId)	
						
						delete global.socketClients[socket.id]
						clean(socket)
					}else{
						socket.emit('ping')	
					}
				},pingInterval)
			}
			global.socketClients[newUuid]=socket
			
			socket.ping()
			
			global.socketTotalConnected++
			logTotalClients()

			socket.timeIntervalId=setInterval(() => {
				if(socket) {
					let t = new Date()
					socket.emit('time', {
						utcNow: t.toISOString().replace('Z', '+00:00'),
						time: t.getTime(),
						server: t.yyyymmddhhmmss(),
						timeOffset: t.getTimezoneOffset() * -1
					})
				}
			}, 1000)

			socket.on('disconnect', () => {
				if(socket && socket.id && socketClients[socket.id]){
					let temp1=socket.id
					
					socketClients[socket.id]=undefined
					delete socketClients[socket.id]
					console.log(`disconnected :`,socket.id)
					logTotalClients()
				}
			})
			Object.keys(moduleHolder).forEach((key) => {
				socket.on(key, (...placeholders) => {
					try{
						moduleHolder[key](socket,...placeholders)
					}catch(err){
						errorLog('[WebsocketAPI]'.cyan,key.green,err.name,err.message)
					}
				})
			})
		})

		eventLog(`[WebsocketAPI]`.cyan,'started')
		resolve()
	})
}




function socketModuleLoader(folder, suffix) {
	let holder = {}
	try {

		let files = fs.readdirSync(folder)
		files.forEach((e) => {
			let f = path.join(folder, e)
			if(!fs.statSync(f).isDirectory()) {
				let fileName = path.basename(f)
				let apiName = fileName.substr(0, fileName.length - suffix.length)
				if(apiName != '' && (apiName + suffix) == fileName) {
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
