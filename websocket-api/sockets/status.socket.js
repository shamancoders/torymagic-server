module.exports = (socket, interval=1000) => {
	if(socket.subscribed) {
		if (!socket.statusIntervalId) {
			socket.statusIntervalId=setInterval(()=>feedStatus(socket),interval)
		}
	} else {
		socket.emit('error', 'Authentication failed')
	}
}

function feedStatus(socket) {
	let status = {
		providers: {},
		os: {
			type:os.type(),
			platform:os.platform(),
			release:os.release(),
			version:os.version(),
			hostname:os.hostname(),
			uptime:os.uptime(),
			freemem:os.freemem(),
			totalmem:os.totalmem(),
		}
	}
	let rateList = reHelper.getLatestRates()

	let limitFark=24 * 60 * 60 * 1000  //1 gun milisaniye olarak, daha eski cekilmis rates bilgisini cikar
	Object.keys(rateList).forEach(currency => {  
		if ((new Date() - rateList[currency].time) > limitFark) {
			delete rateList[currency]
		}
	})

	Object.keys(global.priceProviders).forEach((key)=>{
		status.providers[key]={
			status: global.priceProviders[key].status,
			beginRunning:global.priceProviders[key].beginRunning || null,
			lastOnline:global.priceProviders[key].lastOnline || null,
			symbols: {},
			totalSymbols: 0,
			activeSymbols:0,
		}
		Object.keys(rateList).forEach(currency => {  
			if (rateList[currency].provider == key) {
				status.providers[key].symbols[currency] = rateList[currency]
				status.providers[key].totalSymbols++
				if ((new Date() - rateList[currency].time) < 60 * 1000) {
					status.providers[key].activeSymbols++
				}
			}
		})
	})
	socket.emit('status', status)
	
	
}

