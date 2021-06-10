import { Nullable } from "../../../shared/types";

import * as React from "react";
import { Divider, Overlay, Spinner } from "@blueprintjs/core";

import { Mesh, AbstractMesh, InstancedMesh } from "babylonjs";

import { Tools } from "../../editor/tools/tools";

import { InspectorList } from "../../editor/gui/inspector/fields/list";
import { InspectorButton } from "../../editor/gui/inspector/fields/button";
import { InspectorSection } from "../../editor/gui/inspector/fields/section";

import { AbstractEditorPlugin, IEditorPluginProps } from "../../editor/tools/plugin";

import { ColliderCreator } from "./creator";
import { CollisionsInspector } from "./inspector";

export const title = "Collisions";

export interface ICollisionsToolState {
    /**
     * Defines the reference to the targeted mesh.
     */
    mesh: AbstractMesh;
    /**
     * Defines the reference to the mesh being edited.
     */
    sourceMesh: Mesh;
    /**
     * Defines the reference to the collider mesh in case it exists.
     */
    colliderMesh: Nullable<Mesh>;

    /**
     * Defines the type of the collider.
     */
    colliderType: string;
    /**
     * Defines wether or not the waiting overlay should be visible.
     */
    showOverlay: boolean;
}

export default class CollisionsTool extends AbstractEditorPlugin<ICollisionsToolState> {
    /**
     * Constructor.
     * @param props the component's props.
     */
    public constructor(props: IEditorPluginProps) {
        super(props);

        this.state = {
            mesh: null!,
            sourceMesh: null!,

            showOverlay: false,
            colliderMesh: null,
            colliderType: "None",
        };
    }

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        if (!this.state.sourceMesh) {
            return (
                <div>
                    No mesh exists.
                </div>
            );
        }

        return (
            <div
                style={{ width: "100%", height: "100%" }}
                onMouseLeave={() => this._handleMouseOut()}
                onMouseEnter={() => this._handleMouseEnter()}
            >
                <InspectorSection title="Collider">
                    <InspectorList object={this.state} property="colliderType" label="Type" noUndoRedo items={[
                        { label: "None", data: "None" },
                        { label: "Self", data: "Self" },
                        { label: "Cube", data: "Cube" },
                        { label: "Sphere", data: "Sphere" },
                        { label: "Capsule", data: "Capsule" },
                        { label: "LOD", data: "LOD" },
                    ]} onFinishChange={() => {
                        this._handleColliderChanged();
                    }} />

                    <CollisionsInspector
                        mesh={this.state.sourceMesh}
                        colliderMesh={this.state.colliderMesh}
                        collisionType={this.state.colliderType}
                        onShowOverlay={(o) => this.setState({ showOverlay: o })}
                    />
                </InspectorSection>

                <Divider />

                <InspectorButton label="Close" onClick={() => this.editor.closePlugin(this.props.id)} />
                {this._getWaitingOverlay()}
            </div>
        );
    }

    /**
     * Called on the plugin is ready.
     */
    public onReady(): void {
        if (this.props.openParameters?.mesh) {
            this.setMesh(this.props.openParameters.mesh);
        } else {
            this.editor.closePlugin(this.props.id);
        }
    }

    /**
     * Called on the plugin is closed.
     */
    public onClose(): void {
        if (this.state.colliderMesh) {
            this.state.colliderMesh.visibility = 0;
            this.state.colliderMesh.disableEdgesRendering();
        }
    }

    /**
     * Sets the reference to the mesh to edit its collisions.
     * @param mesh defines the reference to the mesh to edit its collisions.
     */
    public setMesh(mesh: Mesh): void {
        let sourceMesh = mesh;
        if (sourceMesh instanceof InstancedMesh) {
            sourceMesh = sourceMesh.sourceMesh;
        }

        if (this.state.colliderMesh) {
            this.state.colliderMesh.visibility = 0;
        }

        this._configure(mesh);
        this.setState({ sourceMesh, mesh });
    }

    /**
     * Returns the overlay used to notify users that a processs is running.
     */
    private _getWaitingOverlay(): React.ReactNode {
        if (!this.state.showOverlay) {
            return undefined;
        }

        return (
            <Overlay isOpen usePortal={false} lazy>
                <div style={{ left: "50%", top: "50%", transform: "translate(-50%)" }}>
                    <Spinner />
                </div>
            </Overlay>
        );
    }

    /**
     * Configures the tool according to the current state.
     */
    private _configure(mesh: Nullable<Mesh>): void {
        if (!mesh) {
            return;
        }

        const colliderMesh = this._getColliderMesh(mesh) as Nullable<Mesh>;
        const colliderType = colliderMesh?.metadata?.collider?.type ?? (mesh.checkCollisions ? "Self" : "None");

        this.setState({ sourceMesh: mesh, colliderType, colliderMesh });
    }

    /**
     * Returns the collider mesh attached to the given mesh.
     */
    private _getColliderMesh(mesh: AbstractMesh): Nullable<AbstractMesh> {
        return (mesh.getChildMeshes(true).find((m) => m.metadata?.collider) ?? null) as Nullable<AbstractMesh>;
    }

    /**
     * Called on the mouse enters the tool.
     */
    private _handleMouseEnter(): void {
        if (this.state.colliderMesh) {
            this.state.colliderMesh.edgesWidth = 30;
            this.state.colliderMesh.visibility = 0.01;
            this.state.colliderMesh.enableEdgesRendering();
        }
    }

    /**
     * Called on the mouse goes out of the tool.
     */
    private _handleMouseOut(): void {
        if (this.state.colliderMesh) {
            this.state.colliderMesh.visibility = 0;
            this.state.colliderMesh.disableEdgesRendering();
        }
    }

    /**
     * Called on the collider type changed.
     */
    private _handleColliderChanged(): void {
        debugger;
        // Existing collider mesh
        this.state.sourceMesh.instances.forEach((i) => {
            const instancedCollider = this._getColliderMesh(i);
            instancedCollider?.dispose(false, false);
        });

        if (this.state.colliderMesh?.isDisposed() === false) {
            this.state.colliderMesh.dispose(false, false);
        }

        let colliderMesh: Nullable<Mesh> = null;

        // Bounding box
        this.state.sourceMesh.refreshBoundingInfo(true);
        const boundingInfo = this.state.sourceMesh.getBoundingInfo();

        switch (this.state.colliderType) {
            case "Cube":
                colliderMesh = ColliderCreator.CreateCube(this.editor.scene!, boundingInfo);
                break;

            case "Sphere":
                colliderMesh = ColliderCreator.CreateSphere(this.editor.scene!, boundingInfo);
                break;

            case "Capsule":
                colliderMesh = ColliderCreator.CreateCapsule(this.editor.scene!, boundingInfo);
                break;

            case "LOD":
                colliderMesh = ColliderCreator.CreateLod(this.state.sourceMesh);
                break;
        }

        if (colliderMesh) {
            this.state.sourceMesh.checkCollisions = false;
            this._configureColliderMesh(this.state.sourceMesh, colliderMesh);

            this.state.sourceMesh.instances.forEach((i) => {
                i.checkCollisions = false;
                this._configureColliderMesh(i, colliderMesh!.createInstance(i.name));
            });
        } else {
            this.state.sourceMesh.checkCollisions = this.state.colliderType === "Self";
            this.state.sourceMesh.instances.forEach((i) => {
                i.checkCollisions = this.state.colliderType === "Self";
            });
        }

        this.setState({ colliderMesh }, () => {
            this._handleMouseEnter();
            this.editor.graph.refresh();
        });
    }

    /**
     * In case a collider mesh exits, configure it.
     */
    private _configureColliderMesh(parent: AbstractMesh, collider: AbstractMesh): void {
        if (collider instanceof Mesh) {
            collider.visibility = 0.01;
        }

        collider.id = Tools.RandomId();

        collider.metadata ??= {};
        collider.metadata.collider = {
            type: this.state.colliderType,
        };

        collider.checkCollisions = true;
        collider.parent = parent;
    }
}
