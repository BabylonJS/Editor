// Constructor
function Script () {

}

// Called once starting the scripts
Script.prototype.start = function () {
    // You can access the scene everywhere
    scene.clearColor = new BABYLON.Color4(0, 0, 0, 1);

    // You can access the attached object everywhere
    console.log({{type}});
}

// Called on each update
Script.prototype.update = function () {
    // Your code...
}

return Script;
