import { AbstractMesh, Vector3 } from 'babylonjs';
import { AbstractFunction } from './function';

export class GetDirection extends AbstractFunction {
    // Static members
    public static Desc = 'Returns the current direction of the abstract mesh.';
    public static Title = 'Get Direction';

    /**
     * Constructor
     */
    constructor () {
        super(false, {
            title: 'Get Direction',
            inputs: [],
            outputs: [{ name: 'vec3', type: 'vec3' }],
            callback: (obj: AbstractMesh) => {
                const direction = obj.getDirection(new Vector3(
                    <number> this.properties.axisX,
                    <number> this.properties.axisY,
                    <number> this.properties.axisZ
                ));
                this._data[0] = direction.x;
                this._data[1] = direction.y;
                this._data[2] = direction.z;

                this.setOutputData(0, this._data);
            }
        });

        this._data = new Float32Array(3);

        this.addProperty('axisX', 0);
        this.addProperty('axisY', 0);
        this.addProperty('axisZ', 1);
    }
}

export class LookAt extends AbstractFunction {
    // Static members
    public static Desc = 'Sets the new direction of the abstract mesh.';
    public static Title = 'Look At';

    /**
     * Constructor
     */
    constructor () {
        super(true, {
            title: 'Look At',
            inputs: [{ name: 'vec3', type: 'vec3' }],
            outputs: [],
            callback: (obj: AbstractMesh) => {
                const input = this.getInputData(1);
                obj.lookAt(new Vector3(input[0], input[1], input[2]));
            }
        });

        this._data = new Float32Array(3);

        this.addProperty('axisX', 0);
        this.addProperty('axisY', 0);
        this.addProperty('axisZ', 1);
    }
}
