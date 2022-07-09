exports.getParams=(req)=>{
  let params={}
  let headers={}
  Object.keys(req.headers || {}).forEach(key=>{
    let exceptList=['content-type', 'user-agent', 'cache-control', 'host', 'accept-encoding', 'connection', 'content-length','accept']
    if(!exceptList.includes(key))
      headers[key]=req.headers[key]
  })
  Object.assign(params,headers,req.query || {}, req.body || {})

  return params
}

