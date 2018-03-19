"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Window = /** @class */ (function () {
    /**
     * Constructor
     * @param name: the name of the window
     */
    function Window(name) {
        this.element = null;
        this.title = '';
        this.body = '';
        this.buttons = [];
        this.width = 800;
        this.height = 600;
        this.showMax = true;
        this.name = name;
    }
    /**
     * Closes the window
     */
    Window.prototype.close = function () {
        this.element.close();
    };
    /**
     * Locks the window
     * @param message: the message to draw
     */
    Window.prototype.lock = function (message) {
        w2popup.lock(message, true);
    };
    /**
     * Unlocks the window
     */
    Window.prototype.unlock = function () {
        w2popup.unlock();
    };
    /**
     * Opens the window
     */
    Window.prototype.open = function () {
        var _this = this;
        var id = 'WindowButtons';
        var buttons = '';
        for (var i = 0; i < this.buttons.length; i++) {
            buttons += "<button class=\"w2ui-btn\" id=\"" + (id + '-' + this.buttons[i]) + "\">" + this.buttons[i] + "</button>\n";
        }
        this.element = w2popup.open({
            title: this.title,
            body: this.body,
            buttons: buttons,
            width: this.width,
            height: this.height,
            showClose: true,
            showMax: this.showMax,
            modal: true
        });
        // Bind events
        this.buttons.forEach(function (b) {
            var button = $("#" + id + "-" + b);
            button.click(function (ev) { return _this.onButtonClick && _this.onButtonClick(ev.target.id.split('-')[1]); });
        });
        // On close
        this.element.on('close', function () { return _this.onClose && _this.onClose(); });
    };
    /**
     * Opens a window alert
     * @param message: the message to show
     * @param title: the title of the window alert
     */
    Window.CreateAlert = function (message, title) {
        if (title === void 0) { title = 'Notification'; }
        w2alert(message, title);
    };
    return Window;
}());
exports.default = Window;
//# sourceMappingURL=window.js.map