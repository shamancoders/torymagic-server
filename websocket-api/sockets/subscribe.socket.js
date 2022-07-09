module.exports = (socket, connInfo) => {
	db.connectors.findOne({ id: connInfo.id, password: connInfo.password })
		.then(connDoc => {
			if(connDoc==null){
				socket.emit('error', {name:'AUTH',message:'Authentication failed'})
				purgeSocket(socket)
			}else	if(connDoc.lastUuid && global.socketClients[connDoc.lastUuid]){
				socket.emit('error', {name:'MULTIPLE_USAGE',message:'Multiple usage detected. Request rejected'})

				purgeSocket(socket)
			}else{
				connDoc.lastUuid=socket.uuid
				connDoc.lastOnline=new Date()
				connDoc.lastIP=socket.conn.remoteAddress
				connDoc.save()
				.then(connDoc=>{
					socket.subscribed=true
					socket.emit('subscribed','Subscription was successful')
				})
				.catch(err=>socket.emit('error', err))
			}
			
		})
		.catch(err => {
			socket.emit('error', err)
		})
}
