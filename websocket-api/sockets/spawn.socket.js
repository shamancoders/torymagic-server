module.exports = (socket, cmd, params) => {
	if(socket.subscribed) {
		commandLineExecute(socket,cmd,params)
	} else {
		socket.emit('error', 'Authentication failed')
	}
}

var spawn = require('child_process').spawn
function commandLineExecute(socket,cmd,params=[]){
	try{
		
		let proc = spawn(cmd, params)

		let buf = ''
		proc.stdout.on('data', (c) => {
			let line=c.toString()
			if(line.indexOf('\n')>-1){
				if(buf!=null)
					socket.emit('responseConsole',buf)
				buf=''
				let dizi=line.split('\n')
				dizi.forEach((e,index)=>{
					if(index<dizi.length-1){
						socket.emit('responseConsole',`${e}\n`)
					}
				})
				buf+=dizi[dizi.length-1]
			}else{
				buf+=c
			}
		})

		proc.stderr.on('data', (data) => {
			socket.emit('spawn','HATA:' + data.toString('UTF-8'))
		});

		proc.stdout.on('end', () => {
			socket.emit('spawn',buf)
		})
	}catch(tryErr){
		// errorLog(tryErr)
		socket.emit('error',tryErr.message)
	}
}
