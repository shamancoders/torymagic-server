exports.newId = (IP, osInfo) => new Promise((resolve, reject) => {
  let s = generateId()

  function calistir() {
    return new Promise((resolve, reject) => {
      db.connectors.countDocuments({ id: s })
        .then(c => {
          if (c == 0) {
            let newDoc = new db.connectors({
              id: s,
              password: util.randomNumber(1001, 9996),
              lastIP: IP,
              createdIP: IP,
              osInfo: osInfo
            })
            newDoc.save()
              .then(resolve)
              .catch(reject)
          } else {
            s = generateId()
            calistir()
              .then(resolve)
              .catch(reject)
          }
        })
        .catch(reject)
    })

  }

  spamCheck(IP, 'minute', 1, 1)
    .then(c => {
      eventLog(`${IP} in a minute ${c} times`)
      spamCheck(IP, 'hour', 1, 20)
        .then(c => {
          eventLog(`${IP} in one hour ${c} times`)
          calistir()
            .then(resolve)
            .catch(reject)
        })
        .catch(reject)
    })
    .catch(reject)

})


function generateId() {
  let first = util.randomNumber(100, 999).toDigit(3)
  let second = util.randomNumber(0, 999).toDigit(3)
  let third = util.randomNumber(0, 999).toDigit(3)
  return first + second + third
}

function spamCheck(IP, interval, ago, maxCount) {
  return new Promise((resolve, reject) => {
    let t = (new Date()).add(interval, -1 * ago)
    db.connectors.countDocuments({ createdIP: IP, createdDate: { $gte: t } })
      .then(c => {
        if (c > maxCount) {
          reject(`Maximum attempts exceeded`)
        } else {
          resolve(c)
        }
      })
      .catch(reject)
  })
}