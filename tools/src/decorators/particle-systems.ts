import { ISceneDecoratorData } from "./apply";

/**
 * Makes the decorated property linked to the particle system that has the given name.
 * Once the script is instantiated, the reference to the particle system is retrieved
 * from the scene and assigned to the property. Node link cant' be used in constructor.
 * This can be used only by scripts using Classes.
 * @param particleSystemName defines the name of the sound to retrieve in scene.
 */
export function particleSystemFromScene(particleSystemName: string) {
    return function (target: any, propertyKey: string | Symbol) {
        const ctor = target.constructor as ISceneDecoratorData;

        ctor._ParticleSystemsFromScene ??= [];
        ctor._ParticleSystemsFromScene.push({ propertyKey, particleSystemName });
    };
}
