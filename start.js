
global.__root = __dirname // application root folder


require('./initialize')() // initializing some require global variables and include some nodejs modules
	.then(() => {
		let dbLoader = require(path.join(__root, 'db/db-loader')) // loading database models and functions
		let restApi = require(path.join(__root, 'rest-api/rest-api')) // loading rest api controllers and url path routes
		let httpServer = require(path.join(__root, 'lib/http-server')) // starting http server
		let websocketApi = require(path.join(__root, 'websocket-api/websocket-api')) // rates engine
		dbLoader()
			.then(() => testKod(455)
				.then(() => restApi()
					.then(app => httpServer(config.httpserver.port, app)
							.then((server) => websocketApi(server)
								.then(() => eventLog(`Application was started properly :-)`.yellow))
								.catch(showError)
							)
							.catch(showError)
					)
					.catch(showError)
				)
				.catch(showError)
			)
			.catch(showError)
	})
	.catch(showError)


function showError(err) {
	console.log('initialize error:', err)
}

function testKod(a) {
	return new Promise((resolve, reject) => {
		
		return resolve('fitifiti')

		//reject('fitifiti')
	})

}


// Catch Global Crashing
if (config.status != 'development') {
	process.on('uncaughtException', function (err) {
		errorLog('Caught exception: ', err)
		if (mail) {
			mail.sendErrorMail((config.name || 'nodejsapp') + ' Uncaught Exception', err)
				.then(console.log)
				.catch(console.log)
		}
	})

	process.on('unhandledRejection', (reason, promise) => {
		errorLog('Caught Rejection: ', reason)
		if (mail) {
			mail.sendErrorMail((config.name || 'nodejsapp') + ' Unhandled Rejection', reason)
				.then(console.log)
				.catch(console.log)
		}
	})

}