import { Component, ReactNode } from "react";

import { LuMove3D, LuRotate3D, LuScale3D } from "react-icons/lu";

import { Button } from "../../../../ui/shadcn/ui/button";
import { Switch } from "../../../../ui/shadcn/ui/switch";
import { Popover, PopoverTrigger, PopoverContent } from "../../../../ui/shadcn/ui/popover";

import { gizmoSnapMinStep, IGizmoSnapPreferences, roundGizmoSnapSteps } from "../../../../tools/scene/gizmo";

import { EditorInspectorNumberField } from "../../inspector/fields/number";

import { Editor } from "../../../main";

export interface IEditorPreviewGizmoSettingsProps {
	editor: Editor;
}

export interface IEditorPreviewGizmoSettingsState {}

interface _ISnapFieldComponentProps {
	title: string;
	enabled: boolean;
	icon: ReactNode;
	property: "translationStep" | "rotationStepDegrees" | "scaleStep";
	onStepChange: (step: number) => void;
	onEnabledChange: (enabled: boolean) => void;
}

export class EditorPreviewGizmoSettings extends Component<IEditorPreviewGizmoSettingsProps, IEditorPreviewGizmoSettingsState> {
	/**
	 * Mutable holder for gizmo snap step fields; EditorInspectorNumberField writes via setInspectorEffectivePropertyValue.
	 * Synced from state when rendering the gizmo snap toolbar.
	 */
	private _gizmoSnapNumberFields: Pick<IGizmoSnapPreferences, "translationStep" | "rotationStepDegrees" | "scaleStep"> = {
		translationStep: 0,
		rotationStepDegrees: 0,
		scaleStep: 0,
	};

	public constructor(props: IEditorPreviewGizmoSettingsProps) {
		super(props);

		this.state = {};
	}

	public render(): ReactNode {
		const snap = this.props.editor.layout?.preview?.state.gizmoSnap;
		if (!snap) {
			return false;
		}

		this._gizmoSnapNumberFields.translationStep = snap.translationStep;
		this._gizmoSnapNumberFields.rotationStepDegrees = snap.rotationStepDegrees;
		this._gizmoSnapNumberFields.scaleStep = snap.scaleStep;

		return (
			<Popover>
				<PopoverTrigger asChild>
					<Button type="button" variant="outline" className="h-9 px-3 shrink-0 border-input bg-background shadow-sm">
						Snap
					</Button>
				</PopoverTrigger>
				<PopoverContent align="start" side="bottom" className="w-auto max-w-none min-w-[20rem] p-4">
					<div className="flex flex-col gap-3">
						{this._getSnapFieldComponent({
							title: "Translation",
							property: "translationStep",
							enabled: snap.translationEnabled,
							icon: <LuMove3D className="h-4 w-4" />,
							onEnabledChange: (on) => this._commitGizmoSnap({ ...snap, translationEnabled: on }),
							onStepChange: (v) => this._commitGizmoSnap({ ...snap, translationStep: Math.max(gizmoSnapMinStep, v) }),
						})}

						{this._getSnapFieldComponent({
							title: "Rotation (°)",
							property: "rotationStepDegrees",
							enabled: snap.rotationEnabled,
							icon: <LuRotate3D className="h-4 w-4" />,
							onEnabledChange: (on) => this._commitGizmoSnap({ ...snap, rotationEnabled: on }),
							onStepChange: (v) => this._commitGizmoSnap({ ...snap, rotationStepDegrees: Math.max(gizmoSnapMinStep, v) }),
						})}

						{this._getSnapFieldComponent({
							title: "Scaling",
							property: "scaleStep",
							enabled: snap.scaleEnabled,
							icon: <LuScale3D className="h-4 w-4" />,
							onEnabledChange: (on) => this._commitGizmoSnap({ ...snap, scaleEnabled: on }),
							onStepChange: (v) => this._commitGizmoSnap({ ...snap, scaleStep: Math.max(gizmoSnapMinStep, v) }),
						})}
					</div>
				</PopoverContent>
			</Popover>
		);
	}

	private _getSnapFieldComponent(props: _ISnapFieldComponentProps): ReactNode {
		return (
			<div className="flex items-center gap-2">
				<div className="flex items-center gap-2 w-36 cursor-pointer" onClick={() => props.onEnabledChange(!props.enabled)}>
					<Switch checked={props.enabled} onCheckedChange={(v) => props.onEnabledChange(v)} />
					{props.icon}
					<div className="text-sm font-medium text-muted-foreground">{props.title}</div>
				</div>
				<div className="flex-1">
					<EditorInspectorNumberField
						noUndoRedo
						object={this._gizmoSnapNumberFields}
						property={props.property}
						step={0.01}
						min={gizmoSnapMinStep}
						onChange={(v) => props.onStepChange(v)}
						asDegrees={props.property === "rotationStepDegrees"}
					/>
				</div>
			</div>
		);
	}

	private _commitGizmoSnap(next: IGizmoSnapPreferences): void {
		const normalized = roundGizmoSnapSteps(next);

		this.props.editor.layout.preview.gizmo?.setSnapPreferences(normalized);
		this.props.editor.layout.preview.setState({
			gizmoSnap: normalized,
		});
	}
}
