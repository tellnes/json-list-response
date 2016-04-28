
var JSONListStream = require('json-list-stream')
  , inherits = require('util').inherits
  , querystring = require('querystring')
  , xtend = require('xtend')

module.exports = JSONListResponse

JSONListResponse.Query = Query
JSONListResponse.After = After
JSONListResponse.Paging = Paging

function JSONListResponse(options) {
  JSONListStream.call(this)

  this.query = new Query(options.query, options)
  this.after = new (options.After || After)(this.query.after, options)
  this.base = options.base

  this._count = 0

  this.set('query', this.query)
}
inherits(JSONListResponse, JSONListStream)

JSONListResponse.prototype._transform = function (row, chunk, cb) {
  this._count++

  if (this._count > this.query.limit) {
    return cb()
  }

  this.after.add(row)

  return JSONListStream.prototype._transform.apply(this, arguments)
}

JSONListResponse.prototype._flush = function () {
  this.set('paging', new Paging(this))
  return JSONListStream.prototype._flush.apply(this, arguments)
}

function Query(query, options) {
  if (query instanceof Query) return query
  query = query || {}

  options = options || {}

  var defaultLimit = options.defaultLimit || 1000
    , maxLimit = options.maxLimit || 1000

  this.after = query.after || null
  this.limit = Math.min(Math.max( parseInt(query.limit, 10) || defaultLimit, 1), maxLimit)
}


function After(value, options) {
  this.key = options.sortKey || 'id'
  this.value = value || null
}

After.prototype.add = function (row) {
  var value = row[this.key]
  if (!value) return
  this.value = value
}

After.prototype.toString = function () {
  return String(this.value || '')
}

After.prototype.toJSON = function () {
  return this.toString()
}


function Paging(list) {
  this.after = null
  this.next = null
  this.hasMore = list._count > list.query.limit

  this.after = list.after

  if (this.hasMore && list.base) {
    var query = xtend(list.query)
    query.after = this.after.toString()

    this.next = list.base +
                '?' +
                querystring.stringify(query)
  }
}
