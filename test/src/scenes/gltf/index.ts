import { Scene } from "@babylonjs/core";
import { attachScripts } from "../tools";

/**
 * Defines the map of all available scripts in the project.
 */
const scriptsMap = {

}


/**
 * Works as an helper, this will:
 * = attach scripts on objects.
 * @param scene the scene to attach scripts, etc.
 */
export function runScene(scene: Scene): void {
    attachScripts(scriptsMap, scene);
}
