/* global it, beforeEach, afterEach */

var assert = require('assert')
var fs = require('fs')
var path = require('path')
var broccoli = require('broccoli')
var postcssCompiler = require('./')
var postcss = require('postcss')
var rimraf = require('rimraf')
var glob = require('glob')
var async = require('async')

var basicPluginSet = [
  {
    module: require('postcss-pseudoelements')
  }
]

var testWarnPluginSet = [
  {
    module: postcss.plugin('postcss-test-warn', function (opts) {
      return function (css, result) {
        result.warn('This is a warning.')
      }
    })
  }
]

var map = {
  inline: false,
  annotation: false
}

var warnings = []
var warningStreamStub = {
  write: function (warning) {
    warnings.push(warning)
  }
}

beforeEach(function () {
  warnings = []
})

afterEach(function () {
  glob('tmp/*', function (err, files) {
    if (err) {
      console.error(err)
    } else {
      async.forEach(files, rimraf)
    }
  })
})

it('should process css', function () {
  var outputTree = postcssCompiler(['fixture'], 'success.css', 'output.css', basicPluginSet, map)
  outputTree.warningStream = warningStreamStub

  return (new broccoli.Builder(outputTree)).build().then(function (dir) {
    var content = fs.readFileSync(path.join(dir.directory, 'output.css'), 'utf8')
    var sourceMap = JSON.parse(fs.readFileSync(path.join(dir.directory, 'output.css.map'), 'utf8'))

    assert.strictEqual(content.trim(), 'a:before { content: "test"; }')
    assert.strictEqual(sourceMap.mappings, 'AAAA,WAAY,gBAAgB,EAAE')
    assert.deepEqual(warnings, [])
  })
})

it('should throw an error if the inputTrees is not an array', function () {
  assert.throws(function () {
    postcssCompiler('fixture', 'syntax-error.css', 'output.css', testWarnPluginSet, map)
  }, /Expected array for first argument/, 'Did not throw an error for an incorrect inputTree.')
})

// it('should throw an error if no plugins are provided', function () {
  // assert.throws(function () {
    // postcssCompiler(['fixture'], 'syntax-error.css', 'output.css', [], map)
  // }, /You must provide at least 1 plugin in the plugin array/, 'Did not throw an error for having no plugins.')
// })

it('should create stats json', function () {
  var outputTree = postcssCompiler(['fixture'], 'success.css', 'output.css', basicPluginSet, map, { enabled: true })
  outputTree.warningStream = warningStreamStub

  return (new broccoli.Builder(outputTree)).build().then(function (dir) {
    var statsObject = JSON.parse(fs.readFileSync(path.join(dir.directory, 'output.css.stats.json'), 'utf8'))

    assert.strictEqual(statsObject.rules.total, 1)
    assert.deepEqual(warnings, [])
  })
})

it('should expose warnings', function () {
  var outputTree = postcssCompiler(['fixture'], 'warning.css', 'output.css', testWarnPluginSet, map)
  outputTree.warningStream = warningStreamStub

  return (new broccoli.Builder(outputTree)).build().then(function (dir) {
    var content = fs.readFileSync(path.join(dir.directory, 'output.css'), 'utf8')
    assert.strictEqual(content.trim(), 'a {}')
    assert.deepEqual(warnings, [ 'postcss-test-warn: This is a warning.' ])
  })
})

it('should expose syntax errors', function () {
  var outputTree = postcssCompiler(['fixture'], 'syntax-error.css', 'output.css', testWarnPluginSet, map)
  outputTree.warningStream = warningStreamStub

  var count = 0

  return (new broccoli.Builder(outputTree)).build()
  .catch(function (error) {
    count++
    assert.strictEqual(error.name, 'CssSyntaxError')
  })
  .then(function () {
    assert.strictEqual(count, 1)
    assert.deepEqual(warnings, [])
  })
})

it('should expose non-syntax errors', function () {
  var outputTree = postcssCompiler(['fixture'], 'missing-file.css', 'output.css', testWarnPluginSet, map)
  outputTree.warningStream = warningStreamStub

  var count = 0

  return (new broccoli.Builder(outputTree)).build()
  .catch(function () {
    count++
  })
    .then(function () {
      assert.strictEqual(count, 1)
      assert.deepEqual(warnings, [])
    })
})
