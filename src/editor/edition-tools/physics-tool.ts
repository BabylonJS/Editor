import { Mesh, FreeCamera, PhysicsImpostor, AbstractMesh } from 'babylonjs';

import AbstractEditionTool from './edition-tool';
import Tools from '../tools/tools';

export default class PhysicsTool extends AbstractEditionTool<Mesh | FreeCamera> {
    // Public members
    public divId: string = 'PHYSICS-TOOL';
    public tabName: string = 'Physics';

    // Private members
    private _currentImpostor: string = '';

    private _lastMass: number = null;
    private _lastFriction: number = null;
    private _lastRestitution: number = null;

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
                'HeightmapImpostor'
            ];

            const impostor = node.getPhysicsImpostor();
            if (!impostor)
                this._currentImpostor = 'NoImpostor';
            else {
                this._currentImpostor = 'NoImpostor';
                for (const i in PhysicsImpostor) {
                    if (i.indexOf('Impostor') !== -1 && PhysicsImpostor[i] === impostor.type) {
                        this._currentImpostor = i;
                        break;
                    }
                }
            }

            physics.add(this, '_currentImpostor', impostors).name('Impostor').onFinishChange(r => {
                if (r === 'NoImpostor') {
                    this._lastMass = null;
                    this._lastFriction = null;
                    this._lastRestitution = null;
                } else if (node.physicsImpostor) {
                    this._lastMass = node.physicsImpostor.mass;
                    this._lastFriction = node.physicsImpostor.friction;
                    this._lastRestitution = node.physicsImpostor.restitution;
                }

                if (node.physicsImpostor)
                    node.physicsImpostor.dispose();
                
                node.physicsImpostor = new PhysicsImpostor(node, PhysicsImpostor[r], { mass: 0 });
                node.physicsImpostor.mass = this._lastMass || node.physicsImpostor.mass;
                node.physicsImpostor.friction = this._lastFriction || node.physicsImpostor.friction;
                node.physicsImpostor.restitution = this._lastRestitution || node.physicsImpostor.restitution;

                this.editor.core.scene.getPhysicsEngine().setTimeStep(0);
                this.update(node);
            });

            if (impostor && impostor.type !== PhysicsImpostor.NoImpostor) {
                physics.add(impostor, 'mass').step(0.01).name('Mass');
                physics.add(impostor, 'friction').step(0.01).name('Friction');
                physics.add(impostor, 'restitution').step(0.01).name('Restitution');
            }
        }
    }
}
