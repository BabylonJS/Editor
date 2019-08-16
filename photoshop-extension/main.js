(function () {
    "use strict";

    exports.init = function (generator, config) {
        var main = require('./.build/src/main');
        main.init(generator);
    };
})();
