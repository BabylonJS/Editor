import { Mesh, FreeCamera, PhysicsImpostor } from 'babylonjs';

import AbstractEditionTool from './edition-tool';
import Tools from '../tools/tools';

export default class PhysicsTool extends AbstractEditionTool<Mesh | FreeCamera> {
    // Public members
    public divId: string = 'PHYSICS-TOOL';
    public tabName: string = 'Physics';

    // Private members
    private _currentImpostor: string = '';

	/**
	* Returns if the object is supported
	* @param object the object selected in the graph
	*/
    public isSupported(object: any): boolean {
        return object instanceof Mesh || object instanceof FreeCamera;
    }

	/**
	* Updates the edition tool
	* @param object the object selected in the graph
	*/
    public update(node: Mesh | FreeCamera): void {
        super.update(node);

        // Collisions
        const collisions = this.tool.addFolder('Collisions');
        collisions.open();

        collisions.add(node, 'checkCollisions').name('Check Collisions');
        collisions.add(node, 'collisionMask').step(0.01).name('Collision Mask');
        collisions.add(node, 'isBlocker').name('Is Blocker');

        if (node instanceof Mesh)
            collisions.add(node, 'useOctreeForCollisions').name('Use Octree For Collisions');
        else
            this.tool.addVector(collisions, 'Ellipsoid', node.ellipsoid).open();

        // Physics
        if (node instanceof Mesh && node.getScene().isPhysicsEnabled()) {
            const physics = this.tool.addFolder('Physics');
            physics.open();

            const impostors: string[] = [
                'NoImpostor',
                'SphereImpostor',
                'BoxImpostor',
                'PlaneImpostor',
                'MeshImpostor',
                'CylinderImpostor',
                'ParticleImpostor',
                'HeightmapImpostor'
            ];

            const impostor = node.getPhysicsImpostor();
            if (!impostor)
                this._currentImpostor = impostors[0];
            else
                this._currentImpostor = impostors[impostor.type];

            physics.add(this, '_currentImpostor', impostors).name('Impostor').onFinishChange(r => {
                node.physicsImpostor = new PhysicsImpostor(node, PhysicsImpostor[r], { mass: 0 });
                this.update(node);
            });

            if (impostor) {
                physics.add(impostor, 'mass').step(0.01).name('Mass');
                physics.add(impostor, 'friction').step(0.01).name('Friction');
                physics.add(impostor, 'restitution').step(0.01).name('Restitution');
            }
        }
    }
}
