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
	private _mesh: AbstractMesh;
	private _collisionMesh: CollisionMesh | null = null;

	public constructor(props: IEditorInspectorImplementationProps<AbstractMesh>) {
		super(props);

		this.state = {
			computingCollisionMesh: false,
		};

		this._mesh = this.props.object._masterMesh ?? this.props.object;
		if (isInstancedMesh(this._mesh)) {
			this._mesh = this._mesh.sourceMesh;
		}

		const collisionMesh = getCollisionMeshFor(this._mesh as Mesh);
		this._collisionMesh = collisionMesh;
	}

	public render(): ReactNode {
		// if (collisionMesh && isInstancedMesh(this.props.object)) {
		//     return false;
		// }

		return (
			<EditorInspectorSectionField
				title="Collisions"
				isProcessing={this.state.computingCollisionMesh}
				tooltip="Configure collisions using the collisions system of Babylon.js."
			>
				<EditorInspectorSwitchField
					label="Check Collisions"
					object={this._mesh}
					property="checkCollisions"
					onChange={(v) => {
						if (!v && isMesh(this._mesh) && this._collisionMesh) {
							this._disposeCollisionMesh();
						}

						this.forceUpdate();
						this.props.editor.layout.graph.refresh();
					}}
				/>

				{this._mesh.checkCollisions && (
					<div
						className="flex gap-2 items-center"
						onMouseMove={() => this._setTemporaryCollisionMeshVisible(true)}
						onMouseLeave={() => this._setTemporaryCollisionMeshVisible(false)}
					>
						{this._getCollisionType(this._collisionMesh, "cube", <RxCube size={42} />)}
						{this._getCollisionType(this._collisionMesh, "sphere", <ImSphere size={42} />)}
						{this._getCollisionType(this._collisionMesh, "capsule", <RiCapsuleFill size={42} />)}
						{this._getCollisionType(this._collisionMesh, "lod", <GiMeshNetwork size={42} />)}
					</div>
				)}
			</EditorInspectorSectionField>
		);
	}

	public componentWillUnmount(): void {
		if (this._collisionMesh?.isVisible) {
			this._setTemporaryCollisionMeshVisible(false);
		}
	}

	private _getCollisionType(collisionMesh: CollisionMesh | null, type: CollisionMeshType, children: ReactNode): ReactNode {
		return (
			<div
				onClick={() => this._configureCollisionMesh(collisionMesh, this._mesh, type)}
				className={`
                    flex flex-col gap-2 justify-center items-center w-full aspect-square rounded-lg hover:bg-secondary cursor-pointer
                    ${collisionMesh?.type === type ? "bg-secondary" : "bg-accent"}
                    transition-all duration-300 ease-in-out
                `}
			>
				{children}

				<div className="capitalize">{type}</div>
			</div>
		);
	}

	private async _configureCollisionMesh(collisionMesh: CollisionMesh | null, mesh: AbstractMesh, type: CollisionMeshType): Promise<void> {
		if (collisionMesh?.type === type) {
			this._disposeCollisionMesh();
			return this.forceUpdate();
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

		this._setTemporaryCollisionMeshVisible(this._collisionMesh.isVisible);
	}

	private _setTemporaryCollisionMeshVisible(visible: boolean): void {
		this._mesh.visibility = visible ? 0.35 : 1;

		if (this._collisionMesh) {
			this._collisionMesh.isVisible = visible;
			this._collisionMesh.instances?.forEach((i) => (i.isVisible = visible));
		}
	}

	private _disposeCollisionMesh(): void {
		this._collisionMesh?.dispose();
		this._collisionMesh = null;

		this._setTemporaryCollisionMeshVisible(false);
	}
}
