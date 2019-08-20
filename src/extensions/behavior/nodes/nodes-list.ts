import { registerAllTypeNodes } from './list/types';
import { registerAllUtilsNodes } from './list/utils';
import { registerAllMathNodes } from './list/math';
import { registerAllPropertiesNodes } from './list/properties';
import { registerAllTransformsNodes } from './list/transforms';
import { registerAllPointerNodes } from './list/pointer';
import { registerAllKeyboardNodes } from './list/keyboard';
import { registerAllAbstractMeshNodes } from './list/abstract-mesh';
import { registerAllAnimationNodes } from './list/animation';
import { registerAllSoundNodes } from './list/sound';

/**
 * Registers all the available nodes.
 * @param object the object reference being customized using the graph editor.
 */
export function registerAllNodes (object?: any): void {
    registerAllTypeNodes(object);
    registerAllUtilsNodes(object);
    registerAllMathNodes(object);
    registerAllPropertiesNodes(object);
    registerAllTransformsNodes(object);
    registerAllPointerNodes(object);
    registerAllKeyboardNodes(object);
    registerAllAbstractMeshNodes(object);
    registerAllAnimationNodes(object);
    registerAllSoundNodes(object);
}
