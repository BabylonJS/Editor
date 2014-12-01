/// <reference path="./Tests.html" />
/// <reference path="../Core/BabylonEditorUtils.js" />

/* File creating babylon.editor.utils.js tests */

module('CoreUtils', {
    setup: function () {
        var canvas = document.getElementById("renderCanvas");
        this.engine = new BABYLON.Engine(canvas, true);
        this.scene = new BABYLON.Scene(this.engine);
    },
    teardown: function () {
        /// Nothing
    }
});

test('toFloat test', function () {
    equal(BABYLON.Editor.Utils.toFloat("3.14"), 3.14, 'dot : equals PI');
    equal(BABYLON.Editor.Utils.toFloat("3,14"), 3.14, 'coma : equals PI');
});

test('HexToRGBColor', function () {
    var hex = '#000000';
    var color = BABYLON.Editor.Utils.HexToRGBColor(hex);
    equal(color.r, 0, 'r is 0');
    equal(color.g, 0, 'g is 0');
    equal(color.b, 0, 'b is 0');

    hex = '#FFFFFF';
    color = BABYLON.Editor.Utils.HexToRGBColor(hex);
    equal(color.r, 255, 'r is 255');
    equal(color.g, 255, 'g is 255');
    equal(color.b, 255, 'b is 255');
});

test('RGBToHexColor', function () {
    var color = new BABYLON.Color3(0, 0, 0);
    var hex = BABYLON.Editor.Utils.RGBToHexColor(color, false);
    equal(hex, '000000', 'hex is equal to 000000');
    hex = BABYLON.Editor.Utils.RGBToHexColor(color, true);
    equal(hex, '#000000', 'hex is equal to #000000');
    color = new BABYLON.Color3(255, 255, 255);
    hex = BABYLON.Editor.Utils.RGBToHexColor(color, true);
    equal(hex, '#FFFFFF', 'hex is equal to #FFFFFF');
});

test('GetTextureFromName / GetTextureFromName', function () {
    var textures = new Array();
    for (var i = 0; i < 10; i++) {
        var texture = new BABYLON.Texture('url_test_' + i, this.scene);
        texture.name = 'name_test_' + i;
        textures.push(texture);
    }

    for (var i = 0; i < 10; i++)
        equal(BABYLON.Editor.Utils.GetTextureName(textures[i]), 'name_test_' + i);

    for (var i = 0; i < 10; i++) {
        equal(BABYLON.Editor.Utils.GetTextureFromName('name_test_' + i, this.scene), textures[i]);
    }
});
