import { Component, ReactNode } from "react";

import { RxCube } from "react-icons/rx";
import { ImSphere } from "react-icons/im";
import { RiCapsuleFill } from "react-icons/ri";
import { GiMeshNetwork } from "react-icons/gi";

import { AbstractMesh, Mesh, Tools } from "babylonjs";

import { UniqueNumber } from "../../../../tools/tools";
import { getCollisionMeshFor } from "../../../../tools/mesh/collision";
import { isInstancedMesh, isMesh } from "../../../../tools/guards/nodes";

import { CollisionMesh, CollisionMeshType } from "../../../nodes/collision";

import { IEditorInspectorImplementationProps } from "../inspector";

import { EditorInspectorSwitchField } from "../fields/switch";
import { EditorInspectorSectionField } from "../fields/section";

export interface IEditorMeshInspectorState {
    computingCollisionMesh: boolean;
}

export class EditorMeshCollisionInspector extends Component<IEditorInspectorImplementationProps<AbstractMesh>, IEditorMeshInspectorState> {
	private _collisionMesh: CollisionMesh | null = null;

	public constructor(props: IEditorInspectorImplementationProps<AbstractMesh>) {
		super(props);

		this.state = {
			computingCollisionMesh: false,
		};
	}

	public render(): ReactNode {
		let mesh = this.props.object._masterMesh ?? this.props.object;
		if (isInstancedMesh(mesh)) {
			mesh = mesh.sourceMesh;
		}

		const collisionMesh = getCollisionMeshFor(mesh as Mesh);
		this._collisionMesh = collisionMesh;

		// if (collisionMesh && isInstancedMesh(this.props.object)) {
		//     return false;
		// }

		return (
			<EditorInspectorSectionField title="Collisions" isProcessing={this.state.computingCollisionMesh}>
				<EditorInspectorSwitchField label="Check Collisions" object={mesh} property="checkCollisions" onChange={(v) => {
					if (!v && isMesh(mesh) && collisionMesh) {
						collisionMesh.dispose();
					}

					this.forceUpdate();
					this.props.editor.layout.graph.refresh();
				}} />

				{mesh.checkCollisions &&
                    <div
                    	className="flex gap-2 items-center"
                    	onMouseLeave={() => {
                    		mesh.visibility = 1;
                    		if (this._collisionMesh) {
                    			this._collisionMesh.isVisible = false;
                    			this._collisionMesh.instances?.forEach((i) => i.isVisible = false);
                    		}
                    	}}
                    	onMouseMove={() => {
                    		mesh.visibility = 0.35;
                    		if (this._collisionMesh) {
                    			this._collisionMesh.isVisible = true;
                    			this._collisionMesh.instances?.forEach((i) => i.isVisible = true);
                    		}
                    	}}
                    >
                    	{this._getCollisionType(mesh, collisionMesh, "cube", (
                    		<RxCube size={42} />
                    	))}

                    	{this._getCollisionType(mesh, collisionMesh, "sphere", (
                    		<ImSphere size={42} />
                    	))}

                    	{this._getCollisionType(mesh, collisionMesh, "capsule", (
                    		<RiCapsuleFill size={42} />
                    	))}

                    	{this._getCollisionType(mesh, collisionMesh, "lod", (
                    		<GiMeshNetwork size={42} />
                    	))}
                    </div>
				}
			</EditorInspectorSectionField>
		);
	}

	private _getCollisionType(mesh: AbstractMesh, collisionMesh: CollisionMesh | null, type: CollisionMeshType, children: ReactNode): ReactNode {
		return (
			<div
				onClick={() => this._configureCollisionMesh(collisionMesh, mesh, type)}
				className={`
                    flex flex-col gap-2 justify-center items-center w-full aspect-square rounded-lg hover:bg-secondary cursor-pointer
                    ${collisionMesh?.type === type ? "bg-secondary" : "bg-accent"}
                    transition-all duration-300 ease-in-out
                `}
			>
				{children}

				<div className="capitalize">
					{type}
				</div>
			</div>
		);
	}

	private async _configureCollisionMesh(collisionMesh: CollisionMesh | null, mesh: AbstractMesh, type: CollisionMeshType): Promise<void> {
		if (collisionMesh?.type === type) {
			return;
		}

		this.setState({
			computingCollisionMesh: true,
		});

		collisionMesh?.dispose(false, false);
		collisionMesh = new CollisionMesh(`${mesh.name} Collider`, mesh.getScene(), mesh);
		collisionMesh.id = Tools.RandomId();
		collisionMesh.uniqueId = UniqueNumber.Get();

		this._collisionMesh = collisionMesh;

		await collisionMesh.setType(type, mesh);

		this.props.editor.layout.graph.refresh();

		this.setState({
			computingCollisionMesh: false,
		});
	}
}
