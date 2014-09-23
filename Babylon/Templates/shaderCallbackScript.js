// Create init and update functions here :
(function () {
    var time = 0;

    var init = function (material, scene) {
        material.setTexture("textureSampler", new BABYLON.Texture('Tests/textures/diffuse.tga', scene));
    }

    var update = function (material, scene) {
        time += 0.02;
        // Example :
        material.setFloat("time", time);
    }

    return {
        init: init,
        update: update
    }
})();