function makeUUID (a, b, c) {
  var s = [
    a,
    b.substr(0, 4),
    4 + b.substr(4, 3),
    (Number('0x' + b[7]) & 0x3 | 0x8).toString(16) + b.substr(8, 3),
    c
  ]

  return s.join('-')
}

function getHex (input, key, maxlen) {
  var n = 1
  var i = 1
  var count = 1
  var str = input.trim()
  maxlen = Math.min(maxlen || 14, 14)
  for (; true; i++) {
    if (count++ >= str.length && n.toString(16).length >= maxlen) {
      break
    }

    if (str[i] == null) {
      i = 0
    }

    n *= (str.charCodeAt(i) + (i * str.length)) * key
    n = Number(String(n).replace(/0+$/g, ''))

    while (n.toString(16).length > maxlen) {
      n = Math.floor(n / 10)
    }
  }

  return n.toString(16)
}

exports.getUUIDByString = (str) => {
  return makeUUID(
   getHex(str, 0xf6, 8),
   getHex(str, 0x51c, 11),
   getHex(str, 0xd7a, 12)
  )
}
