import { Vector2, Vector3, Ray, BoundingInfo, Scalar, AbstractMesh } from 'babylonjs';
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
        this.rebuildBuffer(size);
    }

    /**
     * Rebuilds the path's finder buffer
     * NOTE: should be done before creating the graph
     * @param width the buffer width
     * @param height the buffer height
     */
    public rebuildBuffer (size: number): void {
        this.width = this.height = size >> 0;

        this.buffer = new Array(this.width).fill(new Array(this.height).fill(0, 0, this.height), 0, this.width);
    }

    /**
     * Rebuilds the path's finder buffer with the given mesh bounding info
     * NOTE: should be done before creating the graph
     * @param mesh the mesh to take as reference for width / height
     */
    public rebuildBufferFromMesh (mesh: AbstractMesh): void {
        // Bounding infos
        mesh.computeWorldMatrix(true);

        const b = mesh._boundingInfo;
        b.update(mesh.getWorldMatrix());

        // Rebuild
        const xd = Math.abs(b.maximum.x) + Math.abs(b.minimum.x);
        const yd = Math.abs(b.maximum.z) + Math.abs(b.minimum.z);

        const size = Math.max(xd, yd);

        this.rebuildBuffer(size);
    }

    /**
     * Get Vector3 path from the given start position to the given 
     * end position
     * @param from the start position (typically the position of the object to move)
     * @param to the end position (typically already known or pre-programmed)
     */
    public fromTo (from: Vector3, to: Vector3): Vector3[] {
        // Compute coordinates to grid's coordinates
        let fromIndex = 0;
        let toIndex = 0;

        for (let i = 0; i < this.points.length; i++) {
            const p = this.points[i];
            if (p.x === from.x && p.z === from.z) {
                fromIndex = i;
                break;
            }
        }

        for (let i = 0; i < this.points.length; i++) {
            const p = this.points[i];
            if (p.x === to.x && p.z === to.z) {
                toIndex = i;
                break;
            }
        }

        const sx = (fromIndex / this.width) >> 0;
        const sy = (fromIndex % this.height) >> 0;

        const ex = (toIndex / this.width) >> 0;
        const ey = (toIndex % this.width) >> 0;

        // Get path
        const path = astar.search(this.graph, this.graph.grid[sx][sy], this.graph.grid[ex][ey]);

        // Result
        const result: Vector3[] = [];
        path.forEach((p, index) => {
            result.push(new Vector3(p.x, Scalar.Lerp(from.y, to.y, index / path.length), p.y));
        });
        return result;
    }

    /**
     * Fills the graph with the given mesh surface geometry using ray
     * casting method.
     * @param mesh: surface mesh (holes are supported)
     */
    public fill (castMeshes: AbstractMesh[], rayHeight?: number, rayLength?: number): void {
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
            const line = this.buffer[x];
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
                    this.buffer[x][y] = 0;
                }
            }
        }

        // Create grah
        this.graph = new Graph(this.buffer, {
            diagonal: true
        });
    }
}
