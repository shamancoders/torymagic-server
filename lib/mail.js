var nodemailer = require('nodemailer')

exports.send = (mailto, subject, body)=> new Promise((resolve, reject)=>{
	mailGonder(mailto, subject, body, (err, result) => {
		if (!err) {
			resolve(result)
		} else {
			reject(err)
		}
	})
})

var lastErrorMails=[]
const errorMailPeriod=120
exports.sendErrorMail = (subject, err) => new Promise((resolve, reject) => {
	lastErrorMails.forEach((e,index) => {
		let f = (new Date()).getTime() - e.time.getTime()
		if (Math.round(f / 1000 / 60) > errorMailPeriod) {
			lastErrorMails.splice(index,1)
		}
	})
	
	let body = 'Error:<br>'
	if (typeof err == 'string') {
		body += err
	} else {
		body += 'code:' + (err.code || err.name || '') + '<br>'
		body += 'message:' + (err.message || '') + '<br>'
	}
	body += 'config.status:' + config.status
	
	if (config.status == 'development') {
		subject='(DEV) ' + subject
	}

	let p = {
		subject: subject,
		body: body,
		time:new Date()
	}
	let bulundu=false
	lastErrorMails.forEach(e => {
		if (e.subject == p.subject && e.body == p.body) {
			let f = (new Date()).getTime() - e.time.getTime()
			if (Math.round(f / 1000/ 60) < errorMailPeriod) {
				bulundu=true
			}
		}
	})
	if (bulundu) {
		return resolve('Ayni email daha once gonderilmis tekrar gondermiyoruz')
	} else {
		lastErrorMails.push(p)
	}

	if (config.mail && config.mail.adminMail) {
		mailGonder(config.mail.adminMail, subject, body, (err, result) => {
			if (!err) {
				resolve(result)
			} else {
				reject(err)
			}
		})
	} else {
		reject({ code: "CONFIG_ERROR", message: "config.mail.adminMail not defined" })
	}
	
})


function mailGonder(mailto, subject, body, cb) {
	try {
		if (!config.mail)
			return cb({ code: "CONFIG_ERROR", message: "config.mail not defined" })
		let mailConfig = config.mail

		
		let smtpTransport = require('nodemailer-smtp-transport')


		subject = subject.substr(0, 130)
		// body = body.wordWrap(130)


		let transporter = nodemailer.createTransport(smtpTransport({
			host: mailConfig.host || '',
			port: mailConfig.port || 587,
			secure: mailConfig.secure || false,
			auth: {
				user: (mailConfig.auth || {}).user || '',
				pass: (mailConfig.auth || {}).pass || ''
			},
			tls: { rejectUnauthorized: false }
		}))

		let mailOptions = {
			from: (mailConfig.auth || {}).user || '',
			to: mailto,
			subject: subject,
			text: body.wordWrap(130),
			html: body
		}

		transporter.sendMail(mailOptions, (error, info) => {
			transporter.close()
			if (error) {
				console.log(`mail.js error:`, error)
				cb(error)
			} else {
				cb(null, info.response)
			}
		})
	} catch (err) {
		cb(err)
	}
}
