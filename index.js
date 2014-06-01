
var JSONListStream = require('json-list-stream')
  , inherits = require('util').inherits
  , querystring = require('querystring')
  , xtend = require('xtend')

module.exports = JSONListResponse

JSONListResponse.Query = Query

function JSONListResponse(options) {
  JSONListStream.call(this)

  this.query = new Query(options.query, options)
  this.base = options.base
  this.idField = options.idField || 'id'


  this._count = 0
  this._last = null

  this.set('query', this.query)
}
inherits(JSONListResponse, JSONListStream)

JSONListResponse.prototype._transform = function (row, chunk, cb) {
  this._count++

  if (this._count > this.query.limit) {
    return cb()
  }

  this._last = row

  return JSONListStream.prototype._transform.apply(this, arguments)
}

JSONListResponse.prototype._flush = function () {
  this.set('paging', new Paging(this))
  return JSONListStream.prototype._flush.apply(this, arguments)
}

function Query(query, options) {
  if (query instanceof Query) return query

  options = options || {}

  var defaultLimit = options.defaultLimit || 1000
    , maxLimit = options.maxLimit || 1000

  this.after = query.after || null
  this.limit = Math.min(Math.max( parseInt(query.limit, 10) || defaultLimit, 1), maxLimit)
}

function Paging(list) {
  this.after = null
  this.next = null
  this.hasMore = list._count > list.query.limit

  if (!list._last)
    return

  this.after = String(list._last[list.idField])

  if (list.base) {
    var query = xtend(list.query)
    query.after = this.after

    this.next = list.base +
                '?' +
                querystring.stringify(query)
  }
}
