module.exports = (socket, apiKey) => {
	eventLog('subscribe.socket.js apiKey:',apiKey)
	apiKey = (apiKey || '').replace('TRIAL_', '')
	apiKey = apiKey.replace('https://', '').replace('http://', '').split(':')[0].split('/')[0]
	// qwerty gecici apiKey cozumu
	switch (apiKey) {
		case 'trade.fxtest.site':
			apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjdXN0b21lciI6IlRlc3QgUGVzYSIsImRvbWFpbiI6InRyYWRlLmZ4dGVzdC5zaXRlIiwiZXhwaXJlRGF0ZSI6IjIwMjMtMDYtMDhUMDA6MDA6MDAuMDAwWiIsInRyaWFsIjpmYWxzZSwiaWF0IjoxNjU0Njg1OTAzLCJleHAiOjE2ODYxODIzOTl9.R5hVTf8VaEKnLHoRqwkP-nHVSJfYkS0dWiTKhITQKwQ'
			break
		case 'trade.pesatr1.com':
			apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjdXN0b21lciI6IlBlc2FUUiIsImRvbWFpbiI6InRyYWRlLnBlc2F0cjEuY29tIiwiZXhwaXJlRGF0ZSI6IjIwNTktMDYtMDhUMDA6MDA6MDAuMDAwWiIsInRyaWFsIjpmYWxzZSwiaWF0IjoxNjU0Njg5NTI4LCJleHAiOjI4MjIyNTYwMDB9.aY71YkDZpjyLEGYKd8h3sa0JjwXkYDceX4Vp3eMIVjk'
			break

	}
	auth.verify(apiKey)
		.then(customerInfo => {
			console.log(`socket.domain`, socket.domain)
			if (socket.domain == customerInfo.domain || customerInfo.trial === true || socket.domain=='localhost') {
				socket.subscribed = true
				socket.customerInfo = customerInfo
				if (socket.customerInfo.trial) {
					socket.emit('subscribed', `(Trial usage) Authentication was successful.`)
				} else {
					socket.emit('subscribed', `Authentication was successful.`)
				}

			} else {
				socket.emit('error', `Wrong domain access. ApiKey generated for '${customerInfo.domain}' but you tried to access from '${socket.domain}'`)
			}
		})
		.catch(err => {
			socket.emit('error', err)
		})
}
