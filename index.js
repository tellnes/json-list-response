
var JSONListStream = require('json-list-stream')
  , inherits = require('util').inherits
  , querystring = require('querystring')
  , xtend = require('xtend')
  , base64url = require('urlsafe-base64')

module.exports = JSONListResponse

JSONListResponse.Query = Query
JSONListResponse.After = After
JSONListResponse.Paging = Paging

function JSONListResponse(options) {
  JSONListStream.call(this)

  this.query = new Query(options.query, options)
  this.after = new After(this.query, options)
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

  options = options || {}

  var defaultLimit = options.defaultLimit || 1000
    , maxLimit = options.maxLimit || 1000

  this.after = query.after || null
  this.limit = Math.min(Math.max( parseInt(query.limit, 10) || defaultLimit, 1), maxLimit)
}

var bytesToNumberTypeMap =
  { 1: 'UInt8'
  , 2: 'UInt16BE'
  , 4: 'UInt32BE'
  , 8: 'DoubleBE'
  }

function After(query, options) {
  this._bytes = options.sortKeyBytes || 8
  this.key = options.sortKey || 'id'
  this.value = 0
  this.skip = 0

  if (query.after) {
    var buf = base64url.decode(query.after)
    if (buf.length === (this._bytes + 1)) {
      this.value = buf['read' + bytesToNumberTypeMap[this._bytes]](0)
      this.skip = buf.readUInt8(this._bytes)
    }
  }
}

After.prototype.add = function (row) {
  var value = row[this.key]
  if (!value) return

  // ObjectID
  if (value.getTimestamp) value = value.getTimestamp()

  value = value.valueOf()

  if (this.value === value) {
    this.skip++
  } else {
    this.skip = 0
    this.value = value
  }
}

After.prototype.toString = function () {
  if (!this.value) return ''

  var buf = new Buffer(this._bytes + 1)

  buf['write' + bytesToNumberTypeMap[this._bytes]](this.value, 0)
  buf.writeUInt8(this.skip, this._bytes)

  return base64url.encode(buf)
}

After.prototype.toJSON = After.prototype.toString

function Paging(list) {
  this.after = null
  this.next = null
  this.hasMore = list._count > list.query.limit

  this.after = list.after

  if (list.base) {
    var query = xtend(list.query)
    query.after = this.after.toString()

    this.next = list.base +
                '?' +
                querystring.stringify(query)
  }
}
