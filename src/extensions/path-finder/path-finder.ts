import { Vector2, Vector3, Ray, BoundingInfo, Scalar, AbstractMesh, Animation, IAnimationKey } from 'babylonjs';
import 'javascript-astar';

export default class PathFinder {
    // Public members
    public graph: Graph = null;

    public width: number;
    public height: number;

    public buffer: number[][];
    public points: Vector3[] = [];

    // Protected members
    protected boundingInfo: BoundingInfo;

    /**
     * Constructor
     * @param width the graph width
     * @param height the graph height
     */
    constructor (size: number) {
        this.rebuildBuffers(size);
    }

    /**
     * Rebuilds the path's finder buffer
     * NOTE: should be done before creating the graph
     * @param width the buffer width
     * @param height the buffer height
     */
    public rebuildBuffers (size: number): void {
        this.width = this.height = size >> 0;

        // this.buffer = new Array(this.width).fill(new Array(this.height).fill(0, 0, this.height), 0, this.width);
        this.buffer = new Array(this.width);
        for (let i = 0; i < this.height; i++)
            this.buffer[i] = new Array(this.height);

        this.points = [];
    }

    /**
     * Get Vector3 path from the given start position to the given 
     * end position
     * @param from the start position (typically the position of the object to move)
     * @param to the end position (typically already known or pre-programmed)
     */
    public fromTo (from: Vector3, to: Vector3, optimize: boolean = false): Vector3[] {
        // Compute coordinates to grid's coordinates
        let fromIndex = -1;
        let toIndex = -1;

        for (let i = 0; i < this.points.length; i++) {
            const p = this.points[i];
            if (!p)
                continue;

            if (p.x === from.x && p.z === from.z) {
                fromIndex = i;
            }

            if (p.x === to.x && p.z === to.z) {
                toIndex = i;
            }

            if (fromIndex !== -1 && toIndex !== -1)
                break;
        }

        const sx = (fromIndex / this.width) >> 0;
        const sy = (fromIndex % this.height) >> 0;

        const ex = (toIndex / this.width) >> 0;
        const ey = (toIndex % this.width) >> 0;

        // Get path
        const path = astar.search(this.graph, this.graph.grid[ex][ey], this.graph.grid[sx][sy], { heuristic: astar.heuristics.diagonal, closest: true });
        if (optimize) {
            // Optimize animation (linear)
            for (let i = path.length - 3; i >= 0; --i) {
                while (path.length - i >= 3) {
                    if (!this._removeAnimationKey(path, i))
                        break;
                }
            }
        }

        // Result
        const result: Vector3[] = [];

        for (let i = 0; i < path.length; i++) {
            const p = path[i];
            if (!p['point'])
                return;
            
            result.push(new Vector3(p['point'].x, Scalar.Lerp(from.y, to.y, i / path.length), p['point'].z));
        }

        return result.reverse();
    }

    /**
     * Creates a new animation from the given path
     * @param path the path to set keys
     */
    public createAnimation (name: string, path: Vector3[], framesPerSecond: number = 60): Animation {
        const a = new Animation(name, 'position', framesPerSecond, Animation.ANIMATIONTYPE_VECTOR3, Animation.ANIMATIONLOOPMODE_RELATIVE, false);
        const keys = new Array<IAnimationKey>(path.length);

        for (let i = 0; i < path.length; i++)
            keys[i] = { frame: i, value: path[i] }

        a.setKeys(keys);

        return a;
    }

    /**
     * Returns the nearest point
     * @param point the point reference
     */
    public findNearestPoint (point: Vector3): Vector3 {
        let lastDistance = Number.MAX_VALUE;
        let nearest = point;

        for (let i = 0; i < this.points.length; i++) {
            const p = this.points[i];
            if (!p)
                continue;

            const d = Vector3.Distance(p, point);
            if (d < lastDistance) {
                lastDistance = d;
                nearest = p;
            }
        }

        return new Vector3(nearest.x, point.y, nearest.z);
    }

    /**
     * Fills the graph with the given mesh surface geometry using ray
     * casting method.
     * @param mesh: surface mesh (holes are supported)
     */
    public fill (castMeshes: AbstractMesh[], rayHeight?: number, rayLength?: number): void {
        // Rebuild buffers
        this.rebuildBuffers(this.width);

        // Bounding box
        const b = new BoundingInfo(Vector3.Zero(), Vector3.Zero());
        const average = Vector3.Zero();

        castMeshes.forEach(cm => {
            cm.computeWorldMatrix(true);

            const cb = cm._boundingInfo;
            cb.update(cm.getWorldMatrix());

            b.minimum.x = Math.min(b.minimum.x, cb.minimum.x);
            b.minimum.y = Math.min(b.minimum.y, cb.minimum.y);
            b.minimum.z = Math.min(b.minimum.z, cb.minimum.z);

            b.maximum.x = Math.max(b.maximum.x, cb.maximum.x);
            b.maximum.y = Math.max(b.maximum.y, cb.maximum.y);
            b.maximum.z = Math.max(b.maximum.z, cb.maximum.z);

            average.x += cb.boundingBox.centerWorld.x;
            average.y += cb.boundingBox.centerWorld.y;
            average.z += cb.boundingBox.centerWorld.z;
        });

        average.x /= castMeshes.length;
        average.y /= castMeshes.length;
        average.z /= castMeshes.length;
        b.boundingBox.centerWorld = average;

        this.boundingInfo = b;

        // For each graph node position, check collision
        const xd = Math.abs(b.maximum.x) + Math.abs(b.minimum.x);
        const yd = Math.abs(b.maximum.z) + Math.abs(b.minimum.z);

        const s = b.boundingBox.centerWorld.subtract(new Vector3(xd / 2, 0, yd / 2));

        for (let x = 0; x < this.width; x++) {
            const rx = (x * xd) / this.width;

            for (let y = 0; y < this.height; y++) {
                const ry = (y * yd) / this.height;

                // Ray cast
                const r = new Ray(s.add(new Vector3(rx, rayHeight || (b.maximum.y + 10), ry)), new Vector3(0, -1, 0), rayLength || 100);
                const p = r.intersectsMeshes(castMeshes, false);

                const hit = p.find(p => p.hit);

                if (hit) {
                    this.points.push(hit.pickedPoint);
                    this.buffer[x][y] = 1;
                }
                else {
                    this.points.push(null);
                    this.buffer[x][y] = 0;
                }
            }
        }

        // Create grah
        this.graph = new Graph(this.buffer, {
            diagonal: true
        });

        // Set points
        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {
                const coord = (y * this.width + x);
                this.graph.grid[y][x]['point'] = this.points[coord];
            }
        }
    }

    // Removes an animation key (used by optimize animation)
    private _removeAnimationKey = (path: GridNode[], i: number): boolean => {
        const first = <Vector3> path[i]['point'];
        const middle = <Vector3> path[i + 1]['point'];
        const last = <Vector3> path[i + 2]['point'];

        if (first.equals(last) && first.equals(middle)) {
            path.splice(i + 1, 1);
            return true;
        }

        const computedMiddleValue = new Vector3(
            first.x * 0.5 + last.x * 0.5,
            first.y * 0.5 + last.y * 0.5,
            first.z * 0.5 + last.z * 0.5
        );

        if (computedMiddleValue.equals(middle)) {
            path.splice(i + 1, 1);
            return true;
        }

        return false;
    }
}
