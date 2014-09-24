// Create init and update functions here :
(function () {
    var time = 0;

    var init = function (manager) {
        //manager.material.setTexture("textureSampler", new BABYLON.Texture('Tests/textures/diffuse.tga', manager.scene));
    }

    var update = function (manager) {
        time += 0.09;
        // Example :
        manager.material.setFloat("time", time);
        manager.log(time);
    }

    return {
        init: init,
        update: update
    }
})();