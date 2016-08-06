/* global it, describe */

var assert = require('assert')
var fs = require('fs')
var path = require('path')
var broccoli = require('broccoli')
var postcssCompiler = require('../')
var postcss = require('postcss')

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

var warningStreamStub = {
  write: function (warning) {
    global.warnings.push(warning)
  }
}

describe('Standard postcss processing with broccoli', function () {
  it('should process css', function () {
    var outputTree = postcssCompiler(['fixture'], 'success.css', 'output.css', { plugins: basicPluginSet, map: map })
    outputTree.warningStream = warningStreamStub

    return (new broccoli.Builder(outputTree)).build().then(function (dir) {
      var content = fs.readFileSync(path.join(dir.directory, 'output.css'), 'utf8')
      var sourceMap = JSON.parse(fs.readFileSync(path.join(dir.directory, 'output.css.map'), 'utf8'))

      assert.strictEqual(content.trim(), 'a:before { content: "test"; }')
      assert.strictEqual(sourceMap.mappings, 'AAAA,WAAY,gBAAgB,EAAE')
      assert.deepEqual(global.warnings, [])
    })
  })

  it('should throw an error if the inputTrees is not an array', function () {
    assert.throws(function () {
      postcssCompiler('fixture', 'syntax-error.css', 'output.css', { plugins: testWarnPluginSet, map: map })
    }, /Expected array for first argument/, 'Did not throw an error for an incorrect inputTree.')
  })

  it('should throw an error if no plugins are provided', function () {
    assert.throws(function () {
      postcssCompiler(['fixture'], 'success.css', 'output.css', { plugins: [], map: map })
    }, /You must provide at least 1 plugin in the plugin array/, 'Did not throw an error for having no plugins.')
  })

  it('should expose warnings', function () {
    var outputTree = postcssCompiler(['fixture'], 'warning.css', 'output.css', { plugins: testWarnPluginSet, map: map })
    outputTree.warningStream = warningStreamStub

    return (new broccoli.Builder(outputTree)).build().then(function (dir) {
      var content = fs.readFileSync(path.join(dir.directory, 'output.css'), 'utf8')
      assert.strictEqual(content.trim(), 'a {}')
      assert.deepEqual(global.warnings, [ 'postcss-test-warn: This is a warning.' ])
    })
  })

  it('should expose syntax errors', function () {
    var outputTree = postcssCompiler(['fixture'], 'syntax-error.css', 'output.css', { plugins: testWarnPluginSet, map: map })
    outputTree.warningStream = warningStreamStub

    var count = 0

    return (new broccoli.Builder(outputTree)).build()
    .catch(function (error) {
      count++
      assert.strictEqual(error.name, 'CssSyntaxError')
    })
    .then(function () {
      assert.strictEqual(count, 1)
      assert.deepEqual(global.warnings, [])
    })
  })

  it('should expose non-syntax errors', function () {
    var outputTree = postcssCompiler(['fixture'], 'missing-file.css', 'output.css', { plugins: testWarnPluginSet, map: map })
    outputTree.warningStream = warningStreamStub

    var count = 0

    return (new broccoli.Builder(outputTree)).build()
    .catch(function () {
      count++
    })
      .then(function () {
        assert.strictEqual(count, 1)
        assert.deepEqual(global.warnings, [])
      })
  })
})
