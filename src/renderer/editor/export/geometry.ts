import { join } from "path";

import { Nullable } from "../../../shared/types";

import GeometryWorker from "../workers/workers/geometry";
import { IWorkerConfiguration, Workers } from "../workers/workers";

import { IBabylonFile } from "../project/typings";

import { Editor } from "../editor";

export class GeometryExporter {
    private static _Worker: Nullable<IWorkerConfiguration> = null;

    /**
     * Initializes the geometry exporter.
     */
    public static async Init(): Promise<void> {
        this._Worker ??= await Workers.LoadWorker("geometry.js");
    }

    /**
     * Exports all the geometries of the given serialized scene to their incremental form.
     * @param editor defines the reference to the editor.
     * @param path defines the absolute path where to export all the geometries of the given scene.
     * @param scene defines the reference to the serialized scene to export its geometries.
     * @param finalExport defines wether or not this export is the final export (generating scene or saving project?).
     * @param overridePath defines the optional path to set before the "geometries/" folder.
     * @param task defines the reference to the optional task used to notify feedbacks to the user about export progress.
     * @returns the list of all geometry files that have been created.
     */
    public static async ExportIncrementalGeometries(editor: Editor, path: string, scene: IBabylonFile, finalExport: boolean, overridePath?: string, task?: string): Promise<string[]> {
        if (task) {
            editor.updateTaskFeedback(task, 0, "Exporting incremental files...");
        }

        const result: string[] = [];
        const promises: Promise<void>[] = [];

        scene.meshes?.forEach((m, index) => {
            if (!m.geometryId || (finalExport && m.metadata?.keepGeometryInline)) { return; }

            const geometry = scene.geometries?.vertexData?.find((v) => v.id === m.geometryId);
            if (!geometry) { return; }

            const geometryFileName = `${geometry.id}.babylonbinarymeshdata`;
            const originMesh = editor.scene!.getMeshByID(m.id);

            m.delayLoadingFile = `${overridePath ?? ""}geometries/${geometryFileName}`;
            m.boundingBoxMaximum = originMesh?.getBoundingInfo()?.maximum?.asArray() ?? [0, 0, 0];
            m.boundingBoxMinimum = originMesh?.getBoundingInfo()?.minimum?.asArray() ?? [0, 0, 0];
            m._binaryInfo = {};

            const geometryPath = join(path, geometryFileName);

            // Call worker
            promises.push(new Promise<void>(async (resolve) => {
                scene.meshes[index] = await Workers.ExecuteFunction<GeometryWorker, "writeIncremental">(this._Worker!, "writeIncremental", m, geometry, geometryPath);
                resolve();
            }));

            if (task) {
                editor.updateTaskFeedback(task, 100 * (index / scene.meshes.length));
            }

            result.push(geometryPath);

            const geometryIndex = scene.geometries!.vertexData!.findIndex((g) => g.id === m.geometryId);
            if (geometryIndex !== -1) {
                scene.geometries!.vertexData!.splice(geometryIndex, 1);
            }
        });

        if (scene.geometries?.vertexData?.length === 0) {
            delete scene.geometries;
        }

        await Promise.all(promises);

        return result;
    }
}
