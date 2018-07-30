import { BrickProceduralTexture } from 'babylonjs-procedural-textures';

import AbstractEditionTool from '../edition-tool';

export default class BrickProceduralTool extends AbstractEditionTool<BrickProceduralTexture> {
    // Public members
    public divId: string = 'BRICK-PROCEDURAL-TOOL';
    public tabName: string = 'Brick';

	/**
	* Returns if the object is supported
	* @param object the object selected in the graph
	*/
    public isSupported (object: any): boolean {
        return object instanceof BrickProceduralTexture;
    }

	/**
	* Updates the edition tool
	* @param object the object selected in the graph
	*/
    public update (object: BrickProceduralTexture): void {
        // Super
        super.update(object);

        // Brick
        const brick = this.tool.addFolder('Brick');
        brick.open();

        brick.add(object, 'numberOfBricksHeight').step(0.01).name('Bricks Height');
        brick.add(object, 'numberOfBricksWidth').step(0.01).name('Bricks Width');

        this.tool.addColor(brick, 'Joint Color', object.jointColor, () => object.updateShaderUniforms()).open();
        this.tool.addColor(brick, 'Brick Color', object.brickColor, () => object.updateShaderUniforms()).open();
    }
}
