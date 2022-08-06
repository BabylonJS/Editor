import { Mesh, SceneSerializer } from "babylonjs";
import { AdvancedDynamicTexture } from "babylonjs-gui";

import { Tools } from "../tools/tools";

export class MeshExporter {
    /**
     * Exports the given mesh to its JSON representation.
     * @param mesh defines the reference to the mesh to export.
     * @param withParents defines if parents must be serialized as well with the mesh.
     * @param withChildren defines if children must be serialized as well with the mesh.
     * @returns the reference to the JSON representation of the given mesh.
     */
    public static ExportMesh(mesh: Mesh, withParents: boolean = false, withChildren: boolean = false): any {
        if (mesh.metadata?.isPickable) {
            mesh.isPickable = mesh.metadata.isPickable;
        }

        const meshMetadata = Tools.GetMeshMetadata(mesh);
        const heightMap = meshMetadata.heightMap;
        const waitingUpdatedReferences = meshMetadata._waitingUpdatedReferences;

        if (waitingUpdatedReferences) {
            delete meshMetadata._waitingUpdatedReferences;
        }

        if (heightMap) {
            delete meshMetadata.heightMap;
        }

        const json = SceneSerializer.SerializeMesh(mesh, withParents, withChildren);
        json.materials = [];
        json.multiMaterials = [];

        // Configure skeletons
        json.skeletons?.forEach((s) => {
            s.bones?.forEach((b) => {
                if (!b.metadata) { return; }
                b.id = b.metadata.originalId;
            });
        });

        // Configure meshes
        json.meshes?.forEach((m) => {
            if (m.metadata) {
                m.metadata = Tools.CloneObject(m.metadata);
            }

            // TODO: fix in babylonjs where restitution is equal to mass when serializing mesh.
            if (mesh.physicsImpostor) {
                m.physicsRestitution = mesh.physicsImpostor.getParam("restitution");
            }

            m.instances?.forEach((i) => {
                const instance = mesh._scene.getMeshById(i.id);
                if (!instance?.physicsImpostor) { return; }

                i.physicsRestitution = instance.physicsImpostor.getParam("restitution");
            });

            // GUI
            if (m.metadata?.guiPath) {
                const material = mesh._scene.getMaterialById(m.materialId);
                if (material) {
                    const activeTextures = material.getActiveTextures();
                    if (!activeTextures.find((t) => t instanceof AdvancedDynamicTexture)) {
                        delete m.metadata.guiPath;
                    }
                }
            }

            delete m.renderOverlay;
        });

        if (mesh.metadata?.isPickable) {
            mesh.isPickable = true;
        }

        json.lods = [];
        for (const lod of mesh.getLODLevels()) {
            const lodJson = { distance: lod.distanceOrScreenCoverage, mesh: null as any };
            if (lod.mesh) {
                lodJson.mesh = SceneSerializer.SerializeMesh(lod.mesh, false, false);
                lodJson.mesh!.materials = [];
            }

            json.lods.push(lodJson);
        }

        meshMetadata.heightMap = heightMap;
        meshMetadata._waitingUpdatedReferences = waitingUpdatedReferences;

        return json;
    }
}
