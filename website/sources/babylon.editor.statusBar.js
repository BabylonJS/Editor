var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var StatusBar = (function () {
            /**
            * Constructor
            * @param core: the editor core instance
            */
            function StatusBar(core) {
                this._elements = [];
                // Initialize
                this._core = core;
                this._element = $("#BABYLON-EDITOR-BOTTOM-PANEL");
                this.panel = core.editor.layouts.getPanelFromType("bottom");
                core.editor.layouts.setPanelSize("bottom", 0);
            }
            // Add a new element in the status bar
            StatusBar.prototype.addElement = function (id, text, img, right) {
                right = right || false;
                this._core.editor.layouts.setPanelSize("bottom", 35);
                this._element.append("<div id=\"" + id + "\" style=\"float: " + (right ? "right" : "left") + "; height: 100%;\">" +
                    (img ? "<img id=\"" + id + "_img\" class=\"w2ui-icon " + img + "\ style=\"display: inline;\"></img>" : "") +
                    "<div id=\"" + id + "_spinner\" class=\"w2ui-spinner\" style=\"width: 20px; height: 20px; display: none;\"></div>" +
                    "<p id=\"" + id + "_text\" style=\"height: 100%; display: inline; vertical-align: super;\">\t" + text + "\t</p>" +
                    "<div id=\"" + id + "_separator\" style=\"border-left:1px solid grey; height: 100%; display: inline-block;\"></div>" +
                    "</div>");
                this._elements.push({
                    id: id,
                    class: img
                });
            };
            // Remove an existing element from the status bar
            StatusBar.prototype.removeElement = function (id) {
                for (var i = 0; i < this._elements.length; i++) {
                    var element = this._elements[i];
                    if (element.id === id) {
                        var htmlElement = $("#" + id, this._element);
                        htmlElement.empty();
                        htmlElement.remove();
                        this._elements.splice(i, 1);
                        if (this._elements.length === 0)
                            this._core.editor.layouts.setPanelSize("bottom", 0);
                        return true;
                    }
                }
                return false;
            };
            // Shows the spinner of an element
            StatusBar.prototype.showSpinner = function (id) {
                var spinner = $("#" + id + "_spinner", this._element);
                spinner.css("display", "inline-block");
            };
            // Hides the spinner of an element
            StatusBar.prototype.hideSpinner = function (id) {
                var spinner = $("#" + id + "_spinner", this._element);
                spinner.css("display", "none");
            };
            // Sets the new text
            StatusBar.prototype.setText = function (id, text) {
                $("#" + id + "_text").html("\t" + text + "\t");
            };
            // Sets the new icon
            StatusBar.prototype.setImage = function (id, image) {
                var item = this._getItem(id);
                var element = $("#" + id + "_img");
                element.removeClass(item.class);
                element.addClass(image);
            };
            // Returns the element from its id
            StatusBar.prototype._getItem = function (id) {
                for (var i = 0; i < this._elements.length; i++) {
                    if (this._elements[i].id === id)
                        return this._elements[i];
                }
                return null;
            };
            return StatusBar;
        }());
        EDITOR.StatusBar = StatusBar;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));

//# sourceMappingURL=babylon.editor.statusBar.js.map
