// Variables
var pipeline = new BABYLON.StandardRenderingPipeline("pipeline", scene, 1.0, null, [scene.activeCamera]);

// Called once starting the scripts
this.start = function () {
    // Pipeline
    pipeline.lensTexture = new BABYLON.Texture("my_lens_texture_file.jpg", scene);
    pipeline.brightThreshold = 0.6;
    
    /**
     * Lens Flare
     */
    /*
    pipeline.LensFlareEnabled = true;
    pipeline.lensFlareStrength = 5;
    pipeline.lensFlareHaloWidth = 0.4;
    pipeline.lensFlareGhostDispersal = 0.1;
    pipeline.lensColorTexture = new BABYLON.Texture("file:lenscolor.png");
    pipeline.lensStarTexture = new BABYLON.Texture("file:lensstar.png");
    pipeline.lensFlareDirtTexture = new BABYLON.Texture("my_lens_texture_file.jpg");
    */

    /**
     * Motion Blur
     */
    /*
    pipeline.MotionBlurEnabled = true;
    pipeline.motionStrength = 0.2;
    */

    /**
     * HDR
     */
    // pipeline.HDREnabled = true;

    /**
     * Volumetric Lights
     */
    /*
    pipeline.sourceLight = scene.getLightByName("my light name (spot or directional)");
    pipeline.VLSEnabled = true;
    pipeline.volumetricLightPower = 1;
    pipeline.volumetricLightCoefficient = 0.05;
    pipeline.volumetricLightStepsCount = 50;
    */
}
