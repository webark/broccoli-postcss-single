/* global beforeEach, afterEach */

var rimraf = require('rimraf')
var glob = require('glob')
var async = require('async')

beforeEach(function () {
  global.warnings = []
})

afterEach(function () {
  if (global.builder) {
    global.builder.cleanup()
  }

  glob('tmp/*', function (err, files) {
    if (err) {
      console.error(err)
    } else {
      async.forEach(files, rimraf)
    }
  })
})
