import { toast } from "sonner";
import { Component, ReactNode } from "react";

import { FaCopy, FaLink } from "react-icons/fa6";
import { IoAddSharp, IoCloseOutline } from "react-icons/io5";

import { XMarkIcon } from "@heroicons/react/20/solid";

import { SkyMaterial } from "babylonjs-materials";
import {
    AbstractMesh, InstancedMesh, Material, Mesh, MorphTarget, MultiMaterial, Node, Observer, PBRMaterial, StandardMaterial,
} from "babylonjs";

import { CollisionMesh } from "../../../nodes/collision";

import { showPrompt } from "../../../../ui/dialog";
import { Button } from "../../../../ui/shadcn/ui/button";
import { Separator } from "../../../../ui/shadcn/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../../../ui/shadcn/ui/tooltip";

import { registerUndoRedo } from "../../../../tools/undoredo";
import { onNodeModifiedObservable } from "../../../../tools/observables";
import { isAbstractMesh, isInstancedMesh, isMesh } from "../../../../tools/guards/nodes";
import { updateLightShadowMapRefreshRate, updatePointLightShadowMapRenderListPredicate } from "../../../../tools/light/shadows";

import { EditorInspectorStringField } from "../fields/string";
import { EditorInspectorSwitchField } from "../fields/switch";
import { EditorInspectorVectorField } from "../fields/vector";
import { EditorInspectorNumberField } from "../fields/number";
import { EditorInspectorSectionField } from "../fields/section";

import { GeometryInspector } from "../geometry/geometry";

import { ScriptInspectorComponent } from "../script/script";

import { onGizmoNodeChangedObservable } from "../../preview/gizmo";

import { EditorTransformNodeInspector } from "../transform";
import { IEditorInspectorImplementationProps } from "../inspector";

import { EditorPBRMaterialInspector } from "../material/pbr";
import { EditorSkyMaterialInspector } from "../material/sky";
import { EditorMultiMaterialInspector } from "../material/multi";
import { EditorStandardMaterialInspector } from "../material/standard";
import { EditorMeshCollisionInspector } from "./collision";

export class EditorMeshInspector extends Component<IEditorInspectorImplementationProps<AbstractMesh>> {
    /**
     * Returns whether or not the given object is supported by this inspector.
     * @param object defines the object to check.
     * @returns true if the object is supported by this inspector.
     */
    public static IsSupported(object: unknown): boolean {
        return isAbstractMesh(object);
    }

    private _castShadows: boolean;

    private _collisionMesh: CollisionMesh | null = null;

    public constructor(props: IEditorInspectorImplementationProps<AbstractMesh>) {
        super(props);

        this._castShadows = props.editor.layout.preview.scene.lights.some((light) => {
            return light.getShadowGenerator()?.getShadowMap()?.renderList?.includes(props.object);
        });
    }

    public render(): ReactNode {
        return (
            <>
                <EditorInspectorSectionField title="Common">
                    <div className="flex justify-between items-center px-2 py-2">
                        <div className="w-1/2">
                            Type
                        </div>

                        <div className="flex justify-between items-center w-full">
                            <div className="text-white/50">
                                {this.props.object.getClassName()}
                            </div>

                            {isInstancedMesh(this.props.object) &&
                                <Button variant="ghost" onClick={() => {
                                    const instance = this.props.object as InstancedMesh;
                                    this.props.editor.layout.preview.gizmo.setAttachedNode(instance.sourceMesh);
                                    this.props.editor.layout.graph.setSelectedNode(instance.sourceMesh);
                                    this.props.editor.layout.inspector.setEditedObject(instance.sourceMesh);
                                }}>
                                    <FaLink className="w-4 h-4" />
                                </Button>
                            }
                        </div>
                    </div>
                    <EditorInspectorStringField label="Name" object={this.props.object} property="name" onChange={() => onNodeModifiedObservable.notifyObservers(this.props.object)} />
                    <EditorInspectorSwitchField label="Pickable" object={this.props.object} property="isPickable" />
                </EditorInspectorSectionField>

                <EditorInspectorSectionField title="Transforms">
                    <EditorInspectorVectorField label={<div className="w-14">Position</div>} object={this.props.object} property="position" />
                    {EditorTransformNodeInspector.GetRotationInspector(this.props.object)}
                    <EditorInspectorVectorField label={<div className="w-14">Scaling</div>} object={this.props.object} property="scaling" />
                </EditorInspectorSectionField>

                <EditorMeshCollisionInspector {...this.props} />

                {this.props.editor.layout.preview.scene.lights.length > 0 &&
                    <EditorInspectorSectionField title="Shadows">
                        <EditorInspectorSwitchField label="Cast Shadows" object={this} property="_castShadows" noUndoRedo onChange={() => this._handleCastShadowsChanged(this._castShadows)} />
                        <EditorInspectorSwitchField label="Receive Shadows" object={this.props.object} property="receiveShadows" />
                    </EditorInspectorSectionField>
                }

                <ScriptInspectorComponent editor={this.props.editor} object={this.props.object} />

                {isMesh(this.props.object) &&
                    <>
                        <GeometryInspector object={this.props.object} />
                        {this._getLODsComponent()}
                    </>
                }

                {this._getMaterialComponent()}
                {this._getSkeletonComponent()}
                {this._getMorphTargetManagerComponent()}

                <EditorInspectorSectionField title="Misc">
                    <EditorInspectorSwitchField label="Infinite Distance" object={this.props.object} property="infiniteDistance" />
                </EditorInspectorSectionField>
            </>
        );
    }

    private _gizmoObserver: Observer<Node> | null = null;

    public componentDidMount(): void {
        this._gizmoObserver = onGizmoNodeChangedObservable.add((node) => {
            if (node === this.props.object) {
                this.props.editor.layout.inspector.forceUpdate();
            }
        });
    }

    public componentWillUnmount(): void {
        if (this._collisionMesh) {
            this._collisionMesh.isVisible = false;
        }

        if (this._gizmoObserver) {
            onGizmoNodeChangedObservable.remove(this._gizmoObserver);
        }
    }

    private _getLODsComponent(): ReactNode {
        const mesh = this.props.object as Mesh;

        const lods = mesh.getLODLevels();
        if (!lods.length) {
            return null;
        }

        const o = {
            distance: lods[lods.length - 1].distanceOrScreenCoverage ?? 1000,
        };

        function sortLods(value: number) {
            const lods = mesh.getLODLevels().slice();
            lods.forEach((lod) => mesh.removeLODLevel(lod.mesh!));

            lods.reverse().forEach((lod, index) => {
                mesh.addLODLevel(value * (index + 1), lod.mesh);
            });
        }

        return (
            <EditorInspectorSectionField title="LODs">
                <EditorInspectorNumberField object={o} property="distance" label="Linear Distance" tooltip="Defines the distance that separates each LODs" step={1} noUndoRedo onChange={(v) => sortLods(v)} onFinishChange={(value, oldValue) => {
                    registerUndoRedo({
                        executeRedo: true,
                        undo: () => sortLods(oldValue),
                        redo: () => sortLods(value),
                    });
                }} />
            </EditorInspectorSectionField>
        );
    }

    private _getMaterialComponent(): ReactNode {
        if (!this.props.object.material) {
            return (
                <EditorInspectorSectionField title="Material">
                    <div className="text-center text-xl">
                        No material
                    </div>
                </EditorInspectorSectionField>
            );
        }

        const inspector = this._getMaterialInspectorComponent(this.props.object.material);
        if (!inspector) {
            return (
                <EditorInspectorSectionField title="Material">
                    <div className="text-center text-yellow-500">
                        Unsupported material type: {this.props.object.material.getClassName()}
                    </div>
                </EditorInspectorSectionField>
            );
        }

        return (
            <div className="relative">
                {inspector}

                <div className="absolute top-[14px] left-0 px-5 w-full opacity-0 hover:opacity-100 transition-opacity duration-300 ease-in-out pointer-events-none">
                    <div className="flex justify-end w-full pointer-events-none">
                        <TooltipProvider delayDuration={0}>
                            <Tooltip>
                                <TooltipTrigger>
                                    <div
                                        onClick={() => {
                                            const mesh = this.props.object;
                                            const material = this.props.object.material;

                                            registerUndoRedo({
                                                executeRedo: true,
                                                undo: () => mesh.material = material,
                                                redo: () => mesh.material = null,
                                            });

                                            this.forceUpdate();
                                        }}
                                        className="cursor-pointer rounded-lg pointer-events-auto hover:bg-destructive transition-colors duration-300 ease-in-out"
                                    >
                                        <XMarkIcon className="w-6 h-6" />
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent className="bg-muted text-muted-foreground text-sm p-2">
                                    Remove this material from the mesh.
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                </div>
            </div>
        );
    }

    private _getMaterialInspectorComponent(material: Material): ReactNode {
        switch (material.getClassName()) {
            case "MultiMaterial": return <EditorMultiMaterialInspector material={this.props.object.material as MultiMaterial} />;
            case "PBRMaterial": return <EditorPBRMaterialInspector material={this.props.object.material as PBRMaterial} />;
            case "StandardMaterial": return <EditorStandardMaterialInspector material={this.props.object.material as StandardMaterial} />;
            case "SkyMaterial": return <EditorSkyMaterialInspector material={this.props.object.material as SkyMaterial} />;
        }
    }

    private _getSkeletonComponent(): ReactNode {
        if (!this.props.object.skeleton) {
            return null;
        }

        return (
            <EditorInspectorSectionField title="Skeleton">
                <EditorInspectorSwitchField label="Need Initial Skin Matrix" object={this.props.object.skeleton} property="needInitialSkinMatrix" />

                <Separator />

                <div className="px-[10px] text-lg text-center">
                    Animation Ranges
                </div>

                {this.props.object.skeleton.getAnimationRanges().filter((range) => range).map((range, index) => (
                    <div key={index} className="flex items-center gap-[10px]">
                        <Button
                            variant="ghost"
                            className="justify-start w-1/2"
                            onDoubleClick={async () => {
                                const name = await showPrompt("Rename Animation Range", "Enter the new name for the animation range", range!.name);
                                if (name) {
                                    range!.name = name;
                                    this.forceUpdate();
                                }
                            }}
                            onClick={() => {
                                this.props.object._scene.stopAnimation(this.props.object.skeleton);
                                this.props.object.skeleton?.beginAnimation(range!.name, true, 1.0);
                            }}
                        >
                            {range!.name}
                        </Button>

                        <div className="flex items-center w-1/2">
                            <EditorInspectorNumberField object={range} property="from" onChange={() => {
                                this.props.editor.layout.preview.scene.stopAnimation(this.props.object.skeleton);
                                this.props.editor.layout.preview.scene.beginAnimation(this.props.object.skeleton, range!.from, range!.from, true, 1.0);
                            }} />
                            <EditorInspectorNumberField object={range} property="to" onChange={() => {
                                this.props.editor.layout.preview.scene.stopAnimation(this.props.object.skeleton);
                                this.props.editor.layout.preview.scene.beginAnimation(this.props.object.skeleton, range!.to, range!.to, true, 1.0);
                            }} />

                            <Button variant="ghost" className="p-2" onClick={() => {
                                try {
                                    navigator.clipboard.writeText(range!.name);
                                    toast.success("Animation range name copied to clipboard");
                                } catch (e) {
                                    toast.error("Failed to copy animation range name");
                                }
                            }}>
                                <FaCopy />
                            </Button>

                            <Button variant="secondary" className="p-2" onClick={() => {
                                this.props.object.skeleton?.deleteAnimationRange(range!.name, false);
                                this.forceUpdate();
                            }}>
                                <IoCloseOutline className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                ))}

                <Button variant="secondary" className="flex items-center gap-[5px] w-full" onClick={async () => {
                    const name = await showPrompt("Add Animation Range", "Enter the name of the new animation range");
                    if (name) {
                        this.props.object.skeleton?.createAnimationRange(name, 0, 100);
                        this.forceUpdate();
                    }
                }}>
                    <IoAddSharp className="w-6 h-6" /> Add
                </Button>
            </EditorInspectorSectionField>
        );
    }

    private _getMorphTargetManagerComponent(): ReactNode {
        if (!this.props.object.morphTargetManager) {
            return null;
        }

        const targets: MorphTarget[] = [];
        for (let i = 0, len = this.props.object.morphTargetManager.numTargets; i < len; ++i) {
            targets.push(this.props.object.morphTargetManager.getTarget(i));
        }

        return (
            <EditorInspectorSectionField title="Morph Targets">
                {targets.map((target, index) => (
                    <EditorInspectorNumberField key={index} object={target} property="influence" min={0} max={1} label={target.name} />
                ))}
            </EditorInspectorSectionField>
        );
    }

    private _handleCastShadowsChanged(enabled: boolean): void {
        const lightsWithShadows = this.props.editor.layout.preview.scene.lights.filter((light) => {
            return light.getShadowGenerator()?.getShadowMap()?.renderList;
        });

        registerUndoRedo({
            executeRedo: true,
            undo: () => {
                lightsWithShadows.forEach((light) => {
                    if (enabled) {
                        const index = light.getShadowGenerator()?.getShadowMap()?.renderList?.indexOf(this.props.object);
                        if (index !== undefined && index !== -1) {
                            light.getShadowGenerator()?.getShadowMap()?.renderList?.splice(index, 1);
                        }
                    } else {
                        light.getShadowGenerator()?.getShadowMap()?.renderList?.push(this.props.object);
                    }

                    updateLightShadowMapRefreshRate(light);
                    updatePointLightShadowMapRenderListPredicate(light);
                });
            },
            redo: () => {
                lightsWithShadows.forEach((light) => {
                    if (enabled) {
                        light.getShadowGenerator()?.getShadowMap()?.renderList?.push(this.props.object);
                    } else {
                        const index = light.getShadowGenerator()?.getShadowMap()?.renderList?.indexOf(this.props.object);
                        if (index !== undefined && index !== -1) {
                            light.getShadowGenerator()?.getShadowMap()?.renderList?.splice(index, 1);
                        }
                    }

                    updateLightShadowMapRefreshRate(light);
                    updatePointLightShadowMapRenderListPredicate(light);
                });

            },
        });
    }
}
