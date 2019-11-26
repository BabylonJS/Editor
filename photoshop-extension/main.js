(function () {
    "use strict";

    var main = require('./.build/src/main');

    exports.init = function (generator, config) {
        main.init(generator);
    };

    exports.close = function (generator) {
        main.close(generator);
    }
})();
