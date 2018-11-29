
module.exports = {
  QueryMap
}

function QueryMap() {
  let map = {}

  function mapKeyValueToRecord(record, key, value) {
    if (!map[key]) map[key] = {[record[key]]: [record]}
    else if (!map[key][value]) map[key][value] = [record]
    else map[key][value].push(record)
  }

  function unmapRecordFromKeyValue(record, key, value) {
    if (map[key] && map[key][value] && map[key][value].indexOf(record) > -1)
      map[key][value].splice(map[key][value].indexOf(record), 1)
  }

  this.add = function(record) {
    let recordProxy = new Proxy(record, {
      get: function(target, key, audience) {
        if (typeof target[key] === 'function') return target[key].bind(recordProxy)
        else return target[key]
      }, 
      set: function(target, key, value) {
        unmapRecordFromKeyValue(target, key, target[key])
        mapKeyValueToRecord(target, key, value)
        target[key] = value
      },
      deleteProperty: function(target, key) {
        unmapRecordFromKeyValue(target, key, target[key])
        delete target[key]
      }
    })
    for (let key in record) mapKeyValueToRecord(record, key, record[key])
  }

  this.selectByKey = function(key) {
    
  }
}