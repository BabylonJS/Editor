(function () {
    "use strict";

    const extension = require('../build/photoshop-extension/src/document');
    const document = new extension.Document();

    exports.init = (generator, config) => {
        document.init(generator);
    };

    exports.close = (generator) => {
        document.close(generator);
    }

    exports.document = document;
})();
