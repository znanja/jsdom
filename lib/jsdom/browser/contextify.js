try {
  module.exports = require('contextify');
} catch (e) {
  // Shim for when the contextify compilation fails.
  // This is not quite as correct, but it gets the job done.
  module.exports = function(sandbox) {
    var vm = require('vm');
    var global = null;

    sandbox.run = function(code, filename) {
      return vm.runInContext(code, sandbox, filename);
    };

    sandbox.getGlobal = function() {
      if (!global) {
        global = vm.runInContext('this', sandbox);
      }
      return global;
    };

    sandbox.dispose = function() {
      global = null;
      sandbox.run = function () {
        throw new Error("Called run() after dispose().");
      };
      sandbox.getGlobal = function () {
        throw new Error("Called getGlobal() after dispose().");
      };
      sandbox.dispose = function () {
        throw new Error("Called dispose() after dispose().");
      };
    };

    return sandbox;
  };
}