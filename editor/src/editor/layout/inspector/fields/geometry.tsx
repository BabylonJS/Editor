import { DragEvent, Component, PropsWithChildren, ReactNode } from "react";
import { extname } from "path/posix";

import { toast } from "sonner";

import { XMarkIcon } from "@heroicons/react/20/solid";
import { MdOutlineQuestionMark } from "react-icons/md";

import { AbstractMesh, Mesh, Scene } from "babylonjs";

import { isScene } from "../../../../tools/guards/scene";
import { registerUndoRedo } from "../../../../tools/undoredo";

import { configureImportedNodeIds, loadImportedSceneFile } from "../../preview/import/import";

export interface IEditorInspectorGeometryFieldProps extends PropsWithChildren {
	title: string;
	property: string;
	object: any;

	noUndoRedo?: boolean;

	scene?: Scene;
	onChange?: (mesh: Mesh | null) => void;
	/** When no mesh is assigned, show this in the preview tile instead of a bare "?" (e.g. imported instancing label + counts). */
	embeddedPlaceholderText?: string;
	/** Optional counts for instancing-only state (imported effect, no reference mesh). */
	embeddedInstancingCounts?: { vertices: number; triangles: number };
}

export interface IEditorInspectorGeometryFieldState {
	dragOver: boolean;
	loading: boolean;
}

/**
 * GLB/GLTF usually parents all meshes under `__root__`, so `!mesh.parent` never matches.
 * The first entry in `meshes` is often an empty or helper mesh — pick one with real indices/vertices.
 */
function pickBestImportedSurfaceMesh(meshes: AbstractMesh[]): Mesh | null {
	let best: Mesh | null = null;
	let bestVertexCount = 0;
	for (const m of meshes) {
		if (!(m instanceof Mesh)) {
			continue;
		}
		const vertexCount = m.getTotalVertices();
		const indexCount = m.getIndices()?.length ?? 0;
		if (vertexCount <= 0 || indexCount < 3) {
			continue;
		}
		if (vertexCount > bestVertexCount) {
			best = m;
			bestVertexCount = vertexCount;
		}
	}
	return best;
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
					{this._getPreviewComponent(mesh, this.props.embeddedPlaceholderText, this.props.embeddedInstancingCounts)}

					<div className="flex flex-col w-full">
						<div className="flex flex-col px-2">
							<div>{this.props.title}</div>
							{mesh && <div className="text-sm text-muted-foreground">{mesh.name}</div>}
						</div>

						{!mesh && this.props.embeddedInstancingCounts && (
							<div className="flex flex-col gap-1 mt-1 w-full">
								<div className="flex justify-between items-center px-2 py-2">
									<div className="w-1/2">Vertices</div>
									<div className="flex justify-between items-center w-full">
										<div className="text-white/50">{this.props.embeddedInstancingCounts.vertices}</div>
									</div>
								</div>
								<div className="flex justify-between items-center px-2 py-2">
									<div className="w-1/2">Faces</div>
									<div className="flex justify-between items-center w-full">
										<div className="text-white/50">{this.props.embeddedInstancingCounts.triangles}</div>
									</div>
								</div>
							</div>
						)}

						{mesh && (
							<div className="flex flex-col gap-1 mt-1 w-full">
								<div className="flex justify-between items-center px-2 py-2">
									<div className="w-1/2">Vertices</div>
									<div className="flex justify-between items-center w-full">
										<div className="text-white/50">{mesh.getTotalVertices()}</div>
									</div>
								</div>
								<div className="flex justify-between items-center px-2 py-2">
									<div className="w-1/2">Faces</div>
									<div className="flex justify-between items-center w-full">
										<div className="text-white/50">{mesh.getTotalIndices() ? mesh.getTotalIndices() / 3 : 0}</div>
									</div>
								</div>
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

	private _getPreviewComponent(
		mesh: Mesh | null | undefined,
		embeddedPlaceholderText?: string,
		embeddedInstancingCounts?: { vertices: number; triangles: number },
	): ReactNode {
		const hasPlaceholder = Boolean(embeddedPlaceholderText) || Boolean(embeddedInstancingCounts);
		return (
			<div className={`flex justify-center items-center ${mesh || hasPlaceholder ? "w-24 h-24" : "w-8 h-8"} aspect-square`}>
				{mesh ? (
					<div className="w-24 h-24 flex items-center justify-center bg-background rounded-lg">
						<div className="text-xs text-center text-muted-foreground">{mesh.name}</div>
					</div>
				) : hasPlaceholder ? (
					<div className="w-24 h-24 flex flex-col items-center justify-center gap-0.5 overflow-hidden bg-background rounded-lg px-1 py-1">
						{embeddedPlaceholderText ? (
							<div className="text-[10px] leading-tight text-center text-muted-foreground break-words">{embeddedPlaceholderText}</div>
						) : (
							<div className="text-[10px] text-center text-muted-foreground">Instancing</div>
						)}
						{embeddedInstancingCounts && (
							<div className="text-[9px] leading-tight text-center text-muted-foreground/90 tabular-nums">
								{embeddedInstancingCounts.vertices}v · {embeddedInstancingCounts.triangles}f
							</div>
						)}
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

			const importedMesh = pickBestImportedSurfaceMesh(result.meshes);

			if (!importedMesh) {
				toast.error("No mesh with geometry found in file (0 vertices or missing indices).");
				this.setState({ loading: false });
				return;
			}

			// Detach so disposing `__root__` transform nodes does not dispose this mesh with the hierarchy.
			importedMesh.parent = null;

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
