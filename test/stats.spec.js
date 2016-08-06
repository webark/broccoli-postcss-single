/* global it, describe */

var assert = require('assert')
var fs = require('fs')
var path = require('path')
var broccoli = require('broccoli')
var postcssCompiler = require('../')

var basicPluginSet = [
  {
    module: require('postcss-pseudoelements')
  }
]

var map = {
  inline: false,
  annotation: false
}

var warningStreamStub = {
  write: function (warning) {
    global.warnings.push(warning)
  }
}

describe('Exporting json data from CSSStats', function () {
  it('should create stats json', function () {
    var outputTree = postcssCompiler(['fixture'], 'success.css', 'output.css', { plugins: basicPluginSet, map: map, stats: { enabled: true } })
    outputTree.warningStream = warningStreamStub

    return (new broccoli.Builder(outputTree)).build().then(function (dir) {
      var statsObject = JSON.parse(fs.readFileSync(path.join(dir.directory, 'output.css.json'), 'utf8'))
      var rules = { total: 1, size: { graph: [1], max: 1, average: 1 } }
      var declarations = { total: 1, properties: { content: ['"test"'] } }
      var mediaQueries = { total: 0, unique: 0, values: [], contents: [] }

      assert.strictEqual(30, statsObject.size, 'Stats: size; did not match')
      assert.deepEqual(rules, statsObject.rules, 'Stats: rules; did not match')
      assert.deepEqual(declarations, statsObject.declarations, 'Stats: declarations; did not match')
      assert.deepEqual(mediaQueries, statsObject.mediaQueries, 'Stats: mediaQueries; did not match')

      assert.deepEqual(global.warnings, [])
    })
  })
})
