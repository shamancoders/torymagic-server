global.mongoose = require('mongoose')
global.mongoosePaginate = require('mongoose-paginate-v2')
global.mongooseAggregatePaginate = require('mongoose-aggregate-paginate-v2')
mongoosePaginate.paginate.options = {
	lean: true,
	limit: 10
}
global.ObjectId = mongoose.Types.ObjectId


// global.dberr = (err, cb) => {
// 	if(!err) {
// 		return true
// 	} else {
// 		if(!cb) {
// 			throw err
// 			return false
// 		} else {
// 			cb(err)
// 			return false
// 		}
// 	}
// }

global.dbnull = (doc, cb, msg = 'Kayıt bulunamadı') => {
	if (doc != null) {
		return true
	} else {
		let err = { code: 'RECORD_NOT_FOUND', message: msg }
		if (!cb) {
			throw err
			return false
		} else {
			cb(err)
			return false
		}
	}
}

global.sendToTrash = (dbModel, collectionName, member, filter) => new Promise((resolve, reject) => {
	let conn = dbModel.conn
	dbModel[collectionName].findOne(filter)
		.then(doc => {
			if (dbModel.relations) {
				let relations = dbModel.relations
				let keys = Object.keys(relations)
				let index = 0
				let errorList = []

				let kontrolEt = () => new Promise((resolve, reject) => {
					if (index >= keys.length)
						return resolve()
					getRepoDbModel(dbModel._id)
						.then(mdl => {
							let k = keys[index]
							let relationFilter
							let errMessage = `Bu kayit <b>${k}</b> tablosuna baglidir.`
							if (Array.isArray(relations[k])) {
								if (relations[k].length > 0)
									if (typeof relations[k][0] == 'string') {
										relationFilter = {}
										relationFilter[relations[k][0]] = doc._id
										if (relations[k].length > 1)
											if (typeof relations[k][1] == 'string') errMessage = relations[k][1]
									}
							} else if (typeof relations[k] == 'object') {
								if (relations[k].field) {
									relationFilter = {}
									relationFilter[relations[k].field] = doc._id
									if (relations[k].filter) Object.assign(relationFilter, relations[k].filter)
									if (relations[k].message) errMessage = relations[k].message
								}
							}

							if (!relationFilter) {
								relationFilter = {}
								relationFilter[relations[k]] = doc._id
							}

							mdl[k].countDocuments(relationFilter)
								.then(c => {
									if (c > 0) errorList.push(`${errMessage} ${c} Kayıt`)
									index++
									setTimeout(() => kontrolEt().then(resolve).catch(reject), 0)
								})
								.catch(reject)

						})
						.catch(reject)
				})


				kontrolEt()
					.then(() => {
						if (errorList.length == 0) {
							resolve()
						} else {
							errorList.unshift('<b>Bağlı kayıt(lar) var. Silemezsiniz!</b>')
							reject({ name: 'RELATION_ERROR', message: errorList.join('\n') })
						}
					})
					.catch((err) => {
						errorList.unshift('<b>Bağlı kayıt(lar) var. Silemezsiniz!</b>')
						if (err) errorList.push(err.message)
						reject({ name: 'RELATION_ERROR', message: errorList.join('\n') })
					})

			} else {
				let rubbishDoc = new dbModel.recycle({ collectionName: collectionName, documentId: doc._id, document: doc, deletedBy: member.username, deletedById: member._id })
				if (!epValidateSync(rubbishDoc, reject))
					return
				rubbishDoc
					.save()
					.then(() => {
						dbModel[collectionName].deleteOne(filter)
							.then(resolve)
							.catch(reject)
					})
					.catch(reject)
			}
		})
		.catch(reject)
})

global.epValidateSync = (doc, reject) => {
	let err = doc.validateSync()
	if (err) {
		let keys = Object.keys(err.errors)
		let returnError = { code: 'HATALI_VERI', message: '' }
		if (keys.length == 1) {
			returnError.message = err.errors[keys[0]].message
		} else {
			keys.forEach((e, index) => {
				returnError.message += `#${(index + 1).toString()} : ${err.errors[e].message}`
				if (index < keys.length - 1)
					returnError.message += '\n'
			})

		}

		reject(returnError)
		return false
	} else {
		return true
	}
}

mongoose.set('debug', false)

process.on('SIGINT', function () {
	mongoose.connection.close(function () {
		eventLog('Mongoose default connection disconnected through app termination')
		process.exit(0)
	})
})

global.db = {
	get nameLog() {
		return `[MongoDB]`.cyan
	}
}

module.exports = () => new Promise((resolve, reject) => {
	connectMongoDatabase('collections', config.mongodb.master, db)
		.then(() => {
			resolve()
		})
		.catch(reject)
})

function connectMongoDatabase(collectionFolder, mongoAddress, dbObj) {
	
	return new Promise((resolve, reject) => {
		if (collectionFolder && mongoAddress && !dbObj.conn) {
			collectionLoader(path.join(__dirname, collectionFolder), '.collection.js', ``)
				.then((holder) => {
				
					dbObj.conn = mongoose.createConnection(mongoAddress, { useNewUrlParser: true, useUnifiedTopology: true, autoIndex: true })
					dbObj.conn.on('connected', () => {
						Object.keys(holder).forEach((key) => {
							dbObj[key] = holder[key](dbObj)
						})
						if (dbObj.conn.active != undefined) {
							eventLog(dbObj.nameLog, 're-connected')
						} else {
							eventLog(dbObj.nameLog, 'connected')
						}
						dbObj.conn.active = true
						resolve(dbObj)
					})

					dbObj.conn.on('error', (err) => {
						dbObj.conn.active = false
						reject(err)
					})

					dbObj.conn.on('disconnected', () => {
						dbObj.conn.active = false
						eventLog(dbObj.nameLog, 'disconnected')

					})

				})
				.catch(err => {
					reject(err)
				})
		} else {
			resolve(dbObj)
		}
	})
}

function collectionLoader(folder, suffix, expression) {
	return new Promise((resolve, reject) => {
		try {
			let collectionHolder = {}
			let files = fs.readdirSync(folder)
			files.forEach((e) => {
				let f = path.join(folder, e)
				if (!fs.statSync(f).isDirectory()) {
					let fileName = path.basename(f)
					let apiName = fileName.substr(0, fileName.length - suffix.length)
					if (apiName != '' && (apiName + suffix) == fileName) {
						collectionHolder[apiName] = require(f)
					}
				}
			})
			resolve(collectionHolder)
		} catch (err) {
			reject(err)
		}
	})
}