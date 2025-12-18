import { DragEvent, Component, PropsWithChildren, ReactNode } from "react";
import { extname } from "path/posix";

import { toast } from "sonner";

import { XMarkIcon } from "@heroicons/react/20/solid";
import { MdOutlineQuestionMark } from "react-icons/md";

import { Scene, Mesh } from "babylonjs";

import { isScene } from "../../../../tools/guards/scene";
import { registerUndoRedo } from "../../../../tools/undoredo";

import { configureImportedNodeIds, loadImportedSceneFile } from "../../preview/import/import";
import { EditorInspectorNumberField } from "./number";

export interface IEditorInspectorGeometryFieldProps extends PropsWithChildren {
	title: string;
	property: string;
	object: any;

	noUndoRedo?: boolean;

	scene?: Scene;
	onChange?: (mesh: Mesh | null) => void;
}

export interface IEditorInspectorGeometryFieldState {
	dragOver: boolean;
	loading: boolean;
}

export class EditorInspectorGeometryField extends Component<IEditorInspectorGeometryFieldProps, IEditorInspectorGeometryFieldState> {
	public constructor(props: IEditorInspectorGeometryFieldProps) {
		super(props);

		this.state = {
			dragOver: false,
			loading: false,
		};
	}

	public render(): ReactNode {
		const mesh = this.props.object[this.props.property] as Mesh | null | undefined;

		return (
			<div
				onDrop={(ev) => this._handleDrop(ev)}
				onDragOver={(ev) => this._handleDragOver(ev)}
				onDragLeave={(ev) => this._handleDragLeave(ev)}
				className={`flex flex-col w-full p-5 rounded-lg ${this.state.dragOver ? "bg-muted-foreground/75 dark:bg-muted-foreground/20" : "bg-muted-foreground/10 dark:bg-muted-foreground/5"} transition-all duration-300 ease-in-out`}
			>
				<div className="flex gap-4 w-full">
					{this._getPreviewComponent(mesh)}

					<div className="flex flex-col w-full">
						<div className="flex flex-col px-2">
							<div>{this.props.title}</div>
							{mesh && <div className="text-sm text-muted-foreground">{mesh.name}</div>}
						</div>

						{mesh && (
							<div className="flex flex-col gap-1 mt-1 w-full">
								<EditorInspectorNumberField noUndoRedo={this.props.noUndoRedo} label="Vertices" object={{ count: mesh.getTotalVertices() }} property="count" />
								<EditorInspectorNumberField
									noUndoRedo={this.props.noUndoRedo}
									label="Faces"
									object={{ count: mesh.getTotalIndices() ? mesh.getTotalIndices()! / 3 : 0 }}
									property="count"
								/>
							</div>
						)}
					</div>
					<div
						onClick={() => {
							const oldMesh = this.props.object[this.props.property];

							this.props.object[this.props.property] = null;
							this.props.onChange?.(null);

							if (!this.props.noUndoRedo) {
								registerUndoRedo({
									executeRedo: true,
									undo: () => {
										this.props.object[this.props.property] = oldMesh;
									},
									redo: () => {
										this.props.object[this.props.property] = null;
									},
								});
							}

							this.forceUpdate();
						}}
						className="flex justify-center items-center w-24 h-full hover:bg-muted-foreground rounded-lg transition-all duration-300"
					>
						{mesh && <XMarkIcon className="w-6 h-6" />}
					</div>
				</div>

				{mesh && this.props.children}
			</div>
		);
	}

	private _getPreviewComponent(mesh: Mesh | null | undefined): ReactNode {
		return (
			<div className={`flex justify-center items-center ${mesh ? "w-24 h-24" : "w-8 h-8"} aspect-square`}>
				{mesh ? (
					<div className="w-24 h-24 flex items-center justify-center bg-background rounded-lg">
						<div className="text-xs text-center text-muted-foreground">{mesh.name}</div>
					</div>
				) : (
					<MdOutlineQuestionMark className="w-8 h-8" />
				)}
			</div>
		);
	}

	private _handleDragOver(ev: DragEvent<HTMLDivElement>): void {
		ev.preventDefault();
		this.setState({ dragOver: true });
	}

	private _handleDragLeave(ev: DragEvent<HTMLDivElement>): void {
		ev.preventDefault();
		this.setState({ dragOver: false });
	}

	private async _handleDrop(ev: DragEvent<HTMLDivElement>): Promise<void> {
		ev.preventDefault();
		this.setState({ dragOver: false, loading: true });

		try {
			const absolutePath = JSON.parse(ev.dataTransfer.getData("assets"))[0];
			const extension = extname(absolutePath).toLowerCase();

			const supportedExtensions = [".x", ".b3d", ".dae", ".glb", ".gltf", ".fbx", ".stl", ".lwo", ".dxf", ".obj", ".3ds", ".ms3d", ".blend", ".babylon"];

			if (!supportedExtensions.includes(extension)) {
				toast.error(`Unsupported geometry format: ${extension}`);
				this.setState({ loading: false });
				return;
			}

			const scene = this.props.scene ?? (isScene(this.props.object) ? this.props.object : this.props.object.getScene?.());

			if (!scene) {
				toast.error("Scene is not available");
				this.setState({ loading: false });
				return;
			}

			const result = await loadImportedSceneFile(scene, absolutePath);

			if (!result || !result.meshes || result.meshes.length === 0) {
				toast.error("Failed to load geometry file");
				this.setState({ loading: false });
				return;
			}

			// Use the first mesh or find a mesh without parent
			let importedMesh: Mesh | null = null;
			for (const m of result.meshes) {
				if (m instanceof Mesh && !m.parent) {
					importedMesh = m;
					break;
				}
			}

			if (!importedMesh && result.meshes.length > 0 && result.meshes[0] instanceof Mesh) {
				importedMesh = result.meshes[0];
			}

			if (!importedMesh) {
				toast.error("No valid mesh found in geometry file");
				this.setState({ loading: false });
				return;
			}

			// Configure imported mesh
			configureImportedNodeIds(importedMesh);
			importedMesh.setEnabled(false); // Hide the source mesh

			const oldMesh = this.props.object[this.props.property];

			this.props.object[this.props.property] = importedMesh;
			this.props.onChange?.(importedMesh);

			if (!this.props.noUndoRedo) {
				registerUndoRedo({
					executeRedo: true,
					undo: () => {
						this.props.object[this.props.property] = oldMesh;
						if (importedMesh && importedMesh !== oldMesh) {
							importedMesh.dispose();
						}
					},
					redo: () => {
						this.props.object[this.props.property] = importedMesh;
					},
					onLost: () => {
						if (importedMesh && importedMesh !== oldMesh) {
							importedMesh.dispose();
						}
					},
				});
			}

			// Dispose other meshes from the imported file
			for (const m of result.meshes) {
				if (m !== importedMesh) {
					m.dispose();
				}
			}

			// Dispose transform nodes
			for (const tn of result.transformNodes) {
				tn.dispose();
			}

			this.forceUpdate();
		} catch (error) {
			console.error("Failed to load geometry:", error);
			toast.error(`Failed to load geometry: ${error instanceof Error ? error.message : String(error)}`);
		} finally {
			this.setState({ loading: false });
		}
	}
}
