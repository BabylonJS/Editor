"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var List = /** @class */ (function () {
    /**
     * Constructor
     * @param name the name of the list
     */
    function List(name) {
        this.element = null;
        this.input = null;
        this.items = [];
        this.name = name;
    }
    /**
     * Sets the new items
     * @param items the new items
     */
    List.prototype.setItems = function (items) {
        this.items = items;
        var field = this.element.data('w2field');
        field.options.items = items.map(function (v) {
            return { id: v, text: v };
        });
        field.refresh();
    };
    /**
     * Sets the selected item
     * @param text: the item's text
     */
    List.prototype.setSelected = function (text) {
        var field = this.element.data('w2field');
        var item = field.options.items.find(function (i) { return i.text === text; });
        if (item) {
            field.options.selected = item;
            field.refresh();
        }
    };
    /**
     * Returns the selected value of the list
     */
    List.prototype.getSelected = function () {
        return this.element.val();
    };
    /**
     * Builds the element
     * The parent HTML element
     */
    List.prototype.build = function (parent, style) {
        var _this = this;
        if (style === void 0) { style = ''; }
        this.input = $("<input type=\"list\" style=\"" + style + "\" />");
        $(parent).append(this.input);
        this.element = this.input.w2field('list', {
            items: this.items.map(function (v) {
                return { id: v, text: v };
            }),
            selected: { id: this.items[0], text: this.items[0] },
            renderItem: function (item) {
                return item.text;
            },
            renderDrop: function (item) {
                return item.text;
            },
            compare: function (item, search) {
                return item.text.indexOf(search) !== -1;
            }
        });
        this.element.change(function (ev) { return _this.onChange && _this.onChange(_this.element.val()); });
    };
    return List;
}());
exports.default = List;
//# sourceMappingURL=list.js.map