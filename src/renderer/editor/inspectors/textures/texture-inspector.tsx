import { basename } from "path";

import { Nullable } from "../../../../shared/types";

import * as React from "react";

import { Texture, CubeTexture, DynamicTexture } from "babylonjs";
import { GUI } from "dat.gui";

import { TextureAssets } from "../../assets/textures";

import { FilesStore } from "../../project/files";

import { Inspector } from "../../components/inspector";
import { AbstractInspector } from "../abstract-inspector";

export class TextureInspector extends AbstractInspector<Texture> {
    private _coordinatesMode: string = "";

    /**
     * Called on a controller finished changes.
     * @override
     */
    public onControllerFinishChange(): void {
        super.onControllerFinishChange();
        this.editor.assets.refresh(TextureAssets, this.selectedObject);
    }

    /**
     * Called on the component did moubnt.
     * @override
     */
    public onUpdate(): void {
        this.addCommon();

        if (this.selectedObject instanceof CubeTexture) {
            this.addCube();
        } else {
            this.addScale();
            this.addOffset();
        }
    }

    /**
     * Adds the common editable properties.
     */
    protected addCommon(): GUI {
        const common = this.tool!.addFolder("Common");
        common.open();
        
        if (this.selectedObject.metadata?.editorName) {
            common.add(this.selectedObject.metadata, 'editorName').name('Name');
        }
        
        common.add(this.selectedObject, "hasAlpha").name("Has Alpha");
        common.add(this.selectedObject, "getAlphaFromRGB").name("Alpha From RGB");
        common.add(this.selectedObject, "gammaSpace").name("Gamme Space");
        common.add(this.selectedObject, "invertZ").name("Invert Z");
        common.add(this.selectedObject, "coordinatesIndex").min(0).step(1).name("Coordinates Index");

        // Coordinates mode
        const modes: string[] = [
            "EXPLICIT_MODE", "SPHERICAL_MODE", "PLANAR_MODE", "CUBIC_MODE",
            "PROJECTION_MODE", "SKYBOX_MODE", "INVCUBIC_MODE", "EQUIRECTANGULAR_MODE",
            "FIXED_EQUIRECTANGULAR_MODE", "FIXED_EQUIRECTANGULAR_MIRRORED_MODE",
        ];
        this._coordinatesMode = modes.find((m) => this.selectedObject.coordinatesMode === Texture[m]) ?? modes[0];
        common.add(this, "_coordinatesMode", modes).name("Coordinates Mode").onChange(() => {
            this.selectedObject.coordinatesMode = Texture[this._coordinatesMode];
        });

        // Add preview
        const name = basename(this.selectedObject.name);

        let path: Nullable<string> = null;
        if (this.selectedObject instanceof DynamicTexture) {
            path = this.selectedObject.getContext().canvas.toDataURL("image/png");
        } else {
            path = FilesStore.GetFileFromBaseName(name)?.path ?? null;
        }

        if (path) {
            if (this.selectedObject instanceof CubeTexture) {
                // TODO: add canvas to preview cube.
                common.addCustom("300px",
                <>
                    <span>{name}</span>
                    <img src="./css/svg/dds.svg" style={{ width: "100%", height: "280px", objectFit: "contain" }}></img>
                </>
            );
            } else {
                common.addCustom("300px",
                    <>
                        <span>{name}</span>
                        <img src={path} style={{ width: "100%", height: "280px", objectFit: "contain" }}></img>
                    </>
                );
            }
        }

        return common;
    }

    /**
     * Adds the cube editable properties.
     */
    protected addCube(): void {
        const cube = this.tool!.addFolder("Cube Texture");
        cube.open();
        cube.add(this.selectedObject, "rotationY").step(0.01).name("Rotation Y");
    }

    /**
     * Adds the scaling editable properties.
     */
    protected addScale(): void {
        const scale = this.tool!.addFolder("Scaling");
        scale.open();

        scale.add(this.selectedObject, "uScale").step(0.01).name("U");
        scale.add(this.selectedObject, "vScale").step(0.01).name("V");
    }

    /**
     * Adds the offset editoble properties.
     */
    protected addOffset(): void {
        const offset = this.tool!.addFolder("Offset");
        offset.open();

        offset.add(this.selectedObject, "uOffset").step(0.01).name("U");
        offset.add(this.selectedObject, "vOffset").step(0.01).name("V");
    }
}

Inspector.registerObjectInspector({
    ctor: TextureInspector,
    ctorNames: ["Texture", "CubeTexture", "DynamicTexture"],
    title: "Texture",
});
