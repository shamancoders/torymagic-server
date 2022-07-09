module.exports = (socket,err) => {
	errorLog(`[Error] id:${socket.clientInfo.id.toConnectorId()}`,err)
	
}
