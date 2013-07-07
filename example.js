var JSONListStream = require('./')
  , http = require('http')
  , Readable = require('stream').Readable
  , inherits = require('util').inherits
  , querystring = require('querystring')

var PORT = 1337

function Query(req) {
  this.after = parseInt(req.query.after, 10) || null
  this.limit = Math.min(Math.max( parseInt(req.query.limit, 10) || 1000, 1), 1000)
  this.start = parseInt(req.query.start, 10) || 0
  this.stop = parseInt(req.query.stop, 10) || 100
}


function MyReadable(query) {
  Readable.call(this, { objectMode: true })

  this.counter = Math.max ( query.start
                          , query.after !== null ? (query.after + 1) : 0
                          )

  this.stop = Math.min( query.stop
                      // We do read one extra to find out if there is more pages
                      , this.counter + query.limit + 1
                      )
}
inherits(MyReadable, Readable)

MyReadable.prototype._read = function () {
  if (this.counter === this.stop)
    return this.push(null)

  this.push({ n: this.counter++ })
}

http.createServer(function (req, res) {
  req.query = querystring.parse(req.url.slice(req.url.indexOf('?') + 1))

  var query = new Query(req)
    , options = { query: query
                , base: 'http://127.0.0.1:' + PORT + '/'
                , idField: 'n'
                }

  ;(new MyReadable(query))
    .pipe(new JSONListStream(options))
    .pipe(res)

}).listen(PORT, function () {

  var req = http.get( { port: PORT
                      , hostname: 'localhost'
                      , path: '/?limit=2&after=3'
                      }
                    )

  req.on('response', function (res) {
    res.pipe(process.stdout)
  })

})
