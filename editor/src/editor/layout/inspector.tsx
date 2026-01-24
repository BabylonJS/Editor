import { Component, ReactNode } from "react";
import { Icon, NonIdealState } from "@blueprintjs/core";

import { FaInfoCircle } from "react-icons/fa";
import { FaCube, FaSprayCanSparkles } from "react-icons/fa6";

import { Tools } from "babylonjs";

import { Editor } from "../main";

import { Badge } from "../../ui/shadcn/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/shadcn/ui/tabs";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "../../ui/shadcn/ui/hover-card";

import { isNode } from "../../tools/guards/nodes";
import { isNodeLocked } from "../../tools/node/metadata";

import { setInspectorSearch } from "./inspector/fields/field";
import { IEditorInspectorImplementationProps } from "./inspector/inspector";

import { EditorSceneInspector } from "./inspector/scene/scene";

import { EditorMeshInspector } from "./inspector/mesh/mesh";
import { EditorTransformNodeInspector } from "./inspector/transform";

import { EditorFileInspector } from "./inspector/file";

import { EditorSpotLightInspector } from "./inspector/light/spot";
import { EditorPointLightInspector } from "./inspector/light/point";
import { EditorDirectionalLightInspector } from "./inspector/light/directional";
import { EditorHemisphericLightInspector } from "./inspector/light/hemispheric";

import { EditorCameraInspector } from "./inspector/camera/editor";
import { EditorFreeCameraInspector } from "./inspector/camera/free";
import { EditorArcRotateCameraInspector } from "./inspector/camera/arc-rotate";

import { EditorSoundInspector } from "./inspector/sound/sound";

import { EditorAdvancedDynamicTextureInspector } from "./inspector/gui/gui";

import { EditorDecalsInspector } from "./inspector/decals/decals";

import { EditorParticleSystemInspector } from "./inspector/particles/particle-system";
import { EditorGPUParticleSystemInspector } from "./inspector/particles/gpu-particle-system";
import { EditorNodeParticleSystemSetMeshInspector } from "./inspector/particles/node-particle-system-set";

import { EditorSpriteInspector } from "./inspector/sprites/sprite";
import { EditorSpriteMapNodeInspector } from "./inspector/sprites/sprite-map";
import { EditorSpriteManagerNodeInspector } from "./inspector/sprites/sprite-manager";

import { EditorSkeletonInspector } from "./inspector/mesh/skeleton";

export interface IEditorInspectorProps {
	/**
	 * The editor reference.
	 */
	editor: Editor;
}

export interface IEditorInspectorState {
	search: string;
	editedObject: unknown | null;
}

export class EditorInspector extends Component<IEditorInspectorProps, IEditorInspectorState> {
	private static _inspectors: ((new (props: IEditorInspectorImplementationProps<any>) => Component<IEditorInspectorImplementationProps<any>>) & {
		IsSupported(object: any): boolean;
	})[] = [
		EditorTransformNodeInspector,
		EditorMeshInspector,

		EditorFileInspector,

		EditorPointLightInspector,
		EditorDirectionalLightInspector,
		EditorSpotLightInspector,
		EditorHemisphericLightInspector,

		EditorCameraInspector,
		EditorFreeCameraInspector,
		EditorArcRotateCameraInspector,

		EditorSceneInspector,

		EditorSoundInspector,
		EditorAdvancedDynamicTextureInspector,

		EditorParticleSystemInspector,
		EditorGPUParticleSystemInspector,
		EditorNodeParticleSystemSetMeshInspector,

		EditorSpriteMapNodeInspector,
		EditorSpriteManagerNodeInspector,
		EditorSpriteInspector,

		EditorSkeletonInspector,
	];

	public constructor(props: IEditorInspectorProps) {
		super(props);

		this.state = {
			search: "",
			editedObject: null,
		};
	}

	public render(): ReactNode {
		const disabled = (this.state.editedObject && isNode(this.state.editedObject) && isNodeLocked(this.state.editedObject)) ?? false;

		return (
			<div className="flex flex-col gap-2 w-full h-full p-2 text-foreground overflow-hidden">
				<Tabs defaultValue="entity" className="flex flex-col gap-2 w-full h-full">
					<TabsList className="w-full">
						<TabsTrigger value="entity" className="flex gap-2 items-center w-full">
							<FaCube className="w-4 h-4" /> Entity
						</TabsTrigger>

						<TabsTrigger value="decals" className="flex gap-2 items-center w-full">
							<FaSprayCanSparkles className="w-4 h-4" /> Decal
						</TabsTrigger>
					</TabsList>

					{disabled && (
						<HoverCard openDelay={150} closeDelay={150}>
							<HoverCardTrigger className="w-full">
								<Badge variant="secondary" className="flex items-center gap-2 w-full">
									<FaInfoCircle className="w-6 h-6" />
									Object is locked and cannot be edited.
								</Badge>
							</HoverCardTrigger>
							<HoverCardContent>The object is locked, meaning it cannot be modified in the inspector. You can unlock it in the scene graph.</HoverCardContent>
						</HoverCard>
					)}

					<input
						type="text"
						placeholder="Search..."
						value={this.state.search}
						onChange={(e) => this._handleSearchChanged(e.currentTarget.value)}
						className="px-5 py-2 rounded-lg bg-primary-foreground outline-none w-full"
					/>

					<TabsContent value="entity" className="w-full h-full overflow-auto">
						<div className={`flex flex-col gap-2 h-full ${disabled ? "pointer-events-none opacity-50 cursor-not-allowed" : ""}`}>{this._getContent()}</div>
					</TabsContent>

					<TabsContent value="decals" className="w-full h-full overflow-auto">
						<EditorDecalsInspector editor={this.props.editor} />
					</TabsContent>
				</Tabs>
			</div>
		);
	}

	/**
	 * Sets the edited object.
	 * @param editedObject defines the edited object.
	 */
	public setEditedObject(editedObject: unknown): void {
		this.setState({ editedObject });
	}

	private _getContent(): ReactNode {
		if (!this.state.editedObject) {
			return <NonIdealState icon={<Icon icon="search" size={96} />} title={<div className="text-white">No object selected</div>} />;
		}

		const inspectors = EditorInspector._inspectors.filter((i) => i.IsSupported(this.state.editedObject)).map((i) => ({ inspector: i }));

		return inspectors.map((i) => <i.inspector key={Tools.RandomId()} editor={this.props.editor} object={this.state.editedObject} />);
	}

	private _handleSearchChanged(search: string): void {
		setInspectorSearch(search);
		this.setState({ search });
	}
}
