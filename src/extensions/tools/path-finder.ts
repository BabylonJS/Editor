import { Mesh, Vector2, Vector3, Ray, BoundingInfo } from 'babylonjs';
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
    constructor (width: number, height: number) {
        this.rebuildBuffer(width, height);
    }

    /**
     * Rebuilds the path's finder buffer
     * NOTE: should be done before creating the graph
     * @param width the buffer width
     * @param height the buffer height
     */
    public rebuildBuffer (width: number, height: number): void {
        this.width = width >> 0;
        this.height = height >> 0;

        this.buffer = new Array(this.width).fill(new Array(this.height).fill(0, 0, this.height), 0, this.width);
    }

    /**
     * Rebuilds the path's finder buffer with the given mesh bounding info
     * NOTE: should be done before creating the graph
     * @param mesh the mesh to take as reference for width / height
     */
    public rebuildBufferFromMesh (mesh: Mesh): void {
        // Bounding infos
        mesh.computeWorldMatrix(true);

        const b = mesh._boundingInfo;
        b.update(mesh.getWorldMatrix());

        // Rebuild
        const xd = Math.abs(b.maximum.x) + Math.abs(b.minimum.x);
        const yd = Math.abs(b.maximum.z) + Math.abs(b.minimum.z);

        this.rebuildBuffer(xd, yd);
    }

    /**
     * Get Vector3 path from the given start position to the given 
     * end position
     * @param from the start position (typically the position of the object to move)
     * @param to the end position (typically already known or pre-programmed)
     */
    public fromTo (from: Vector3, to: Vector3): Vector3[] {
        // Result
        const result: Vector3[] = [];

        // Compute
        // TODO: convert coordinates to grid's coordinates
        const sx = (0) >> 0;
        const sy = (0) >> 0;

        const ex = (0) >> 0;
        const ey = (0) >> 0;

        // Get path
        const p = astar.search(this.graph, this.graph.grid[sx][sy], this.graph.grid[ex][ey]);

        p.forEach(p => {
            // TODO: interpolate y
            result.push(new Vector3(p.x, 0, p.y));
        });
        return result;
    }

    /**
     * Fills the graph with the given mesh surface geometry using ray
     * casting method.
     * @param mesh: surface mesh (holes are supported)
     */
    public fill (mesh: Mesh, castMeshes: Mesh[] = [mesh], rayHeight?: number, rayLength?: number): void {
        // Scene
        mesh.computeWorldMatrix(true);

        // Bounding box
        const b = mesh._boundingInfo;
        b.update(mesh.getWorldMatrix());

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
                const p = r.intersectsMesh(mesh, false);

                if (p.hit) {
                    this.points.push(p.pickedPoint);
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
