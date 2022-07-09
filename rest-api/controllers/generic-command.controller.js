module.exports = (connector, params, req) => new Promise((resolve, reject) => {
	// let apiName = path.basename(__filename, '.controller.js')
	let apiName = req.params.func
	let responseName = `response-${apiName}`
	connector.socket._events[responseName] = (success, result) => {
		if (success)
			resolve(result)
		else
			reject(result)
	}

	if (['GET', 'POST', 'PUT'].includes(req.method)) {
		connector.socket.emit(apiName, params, responseName)
	} else
		restError.method(req, reject)
})

