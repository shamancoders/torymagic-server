
module.exports = (app) => {
	// app.all('/', (req, res, next) => {
	// 	res.status(200).json({ success: true, data: { name: config.name || '', description: config.description || '', version: config.version || '', status: config.status } })
	// })

	let apiWelcomeMessage = { message: `Welcome to ${config.name} API V1. Usage: /api/v1/:func/[:param1]/[:param2]/[:param3] . Methods: GET, POST, PUT, DELETE `, status: config.status }
	app.all('/api', function (req, res) {
		res.status(200).json({ success: true, data: apiWelcomeMessage })
	})

	app.all('/api/v1', function (req, res) {
		res.status(200).json({ success: true, data: apiWelcomeMessage })
	})

	masterControllers(app, '/api/v1/:func/:param1/:param2/:param3', 'controllers')


	// catch 404 and forward to error handler
	app.use((req, res, next) => {
		res.status(404).json({ success: false, error: { name: '404', message: 'function not found' } })
	})

	app.use((err, req, res, next) => {
		sendError(err, res)
	})
}

function masterControllers(app, route, folder) {
	setRoutes(app, route, (req, res, next) => {
		let ctl = getController(folder, req.params.func)
		if (!ctl)
			return next()
		passport(req)
			.then(connector => {
				let params = restHelper.getParams(req)

				try {
					ctl(connector, params, req)
						.then(data => {
							if (data == undefined)
								res.json({ success: true })
							else if (data == null)
								res.json({ success: true })
							else {
								res.status(200).json({ success: true, data: data })
							}
						})
						.catch(next)
				} catch (err) {
					sendError(err, res)
				}
			})
			.catch(next)
	})

}

var ipList = {}

function passport(req) {
	return new Promise((resolve, reject) => {
		let IP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || ''
		let t = (new Date()).getTime()
		if (ipList[IP] && ipList[IP].suspended.getTime() > t) {
			let fark = Math.ceil((ipList[IP].suspended.getTime() - t) / 1000 / 60)
			return reject({ name: 'SPAM', message: `Your request was detected as spam. After ${fark} minutes, try again` })
		}
		let id = req.body.id || req.query.id || req.headers.id || ''
		let password = req.body.password || req.query.password || req.headers.password || ''
		if (id && password) {
			db.connectors.findOne({ id: id, password: password })
				.then(connDoc => {
					if (connDoc == null) {
						if (detectSpamAttempts(IP)) {
							reject({ name: 'SPAM', message: `Your request was detected as spam. After 60 minutes, try again` })
						} else {
							reject({ name: 'AUTH', message: `Authentication failed` })
						}
					} else {
						if (global.socketClients && global.socketClients[connDoc.lastUuid]) {
							let connector = connDoc.toJSON()
							connector.socket = global.socketClients[connDoc.lastUuid]
							resolve(connector)
						} else {
							reject({ name: 'OFFLINE', message: 'Connector is not active now.' })
						}
					}
				})
				.catch(reject)
		} else {
			if (detectSpamAttempts(IP)) {
				reject({ name: 'SPAM', message: `Your request was detected as spam. After 60 minutes, try again` })
			} else {
				reject({ name: 'AUTH', message: `Authentication failed` })
			}
		}

	})
}

function detectSpamAttempts(IP) {
	if (ipList[IP] == undefined) {
		ipList[IP] = {
			attemptCount: 1,
			firstAttempt: new Date(),
			suspended: (new Date).add('minute', -1)
		}
		return false
	} else {
		if (ipList[IP].firstAttempt == null) {
			ipList[IP].firstAttempt = new Date()
		}
		ipList[IP].attemptCount++
		let fark = ((new Date()).getTime() - ipList[IP].firstAttempt.getTime()) / 1000

		if (ipList[IP].attemptCount > 10 && fark < 60) {
			ipList[IP].suspended = (new Date()).add('hour', 1)
			ipList[IP].attemptCount = 0
			ipList[IP].firstAttempt = null
			return true
		} else if (ipList[IP].attemptCount > 30 && fark > 60 && fark < 3600) {
			ipList[IP].suspended = (new Date()).add('hour', 1)
			ipList[IP].attemptCount = 0
			ipList[IP].firstAttempt = null

			return true
		} else if (ipList[IP].attemptCount > 10 && fark > 60) {
			ipList[IP].attemptCount = 0
			ipList[IP].firstAttempt = null
			return false
		} else {
			return false
		}

	}
}

function getController(folder, funcName) {
	let controllerName = path.join(__dirname, folder, `generic-command.controller.js`)
	if(['message','mssql','mysql','pg','read-excel','write-excel','read-file','write-file','datetime','cmd'].includes(funcName)==false)
		controllerName = path.join(__dirname, folder, `${funcName}.controller.js`)
	if (fs.existsSync(controllerName) == false) {
		return null
	} else {
		return require(controllerName)

	}
}


function sendError(err, res) {

	let error = { name: '403', message: '' }
	if (typeof err == 'string') {
		error.message = err
	} else {
		error.name = err.code || err.name || 'ERROR'
		if (err.message)
			error.message = err.message
		else
			error.message = err.name || ''
	}

	res.status(401).json({ success: false, error: error })
}

function setRoutes(app, route, cb1, cb2) {
	let dizi = route.split('/:')
	let yol = ''
	dizi.forEach((e, index) => {
		if (index > 0) {
			yol += `/:${e}`
			if (cb1 != undefined && cb2 == undefined) {
				app.all(yol, cb1)
			} else if (cb1 != undefined && cb2 != undefined) {
				app.all(yol, cb1, cb2)
			}
		} else {
			yol += e
		}
	})
}


global.restError = {
	param1: function (req, next) {
		next({ name: 'INCORRECT_PARAMETER', message: `function:[/${req.params.func}] [/:param1] is required` })
	},
	param2: function (req, next) {
		next({ name: 'INCORRECT_PARAMETER', message: `function:[/${req.params.func}/${req.params.param1}] [/:param2] is required` })
	},
	method: function (req, next) {
		next({ name: 'INCORRECT_METHOD', message: `function:${req.params.func} WRONG METHOD: ${req.method}` })
	},
	auth: function (req, next) {
		next({ name: 'AUTH_FAILED', message: `Authentication failed` })
	},
	data: function (req, next, field) {
		if (field) {
			next({ name: 'INCORRECT_DATA', message: `"${field}" Incorrect or missing data` })

		} else {
			next({ name: 'INCORRECT_DATA', message: `Incorrect or missing data` })

		}
	}
}