"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Dialog = /** @class */ (function () {
    function Dialog() {
    }
    /**
     * Creates a GUI dialog window
     * @param title the title of the window
     * @param body the body of the window
     * @param callback the dialog's callback
     * @param yes callback when user clicks "yes"
     * @param no callback when the user clicks "no"
     */
    Dialog.Create = function (title, body, callback, yes, no) {
        w2confirm(body, title, function (result) { return callback(result); })
            .yes(function () { return yes && yes(); })
            .no(function () { return no && no(); });
    };
    return Dialog;
}());
exports.default = Dialog;
//# sourceMappingURL=dialog.js.map