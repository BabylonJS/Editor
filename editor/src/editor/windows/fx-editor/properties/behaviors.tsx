import { ReactNode } from "react";

import { EditorInspectorSectionField } from "../../../layout/inspector/fields/section";

import { Button } from "../../../../ui/shadcn/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../../../../ui/shadcn/ui/dropdown-menu";
import { AiOutlinePlus, AiOutlineClose } from "react-icons/ai";

import { IFXParticleData } from "./types";

export interface IFXEditorBehaviorsPropertiesProps {
	particleData: IFXParticleData;
	onChange: () => void;
}

export function FXEditorBehaviorsProperties(props: IFXEditorBehaviorsPropertiesProps): ReactNode {
	const { particleData, onChange } = props;

	return (
		<>
			{particleData.behaviors.map((behavior, index) => (
				<EditorInspectorSectionField key={index} title={behavior.type}>
					{/* TODO: Add behavior-specific properties */}
					<Button
						variant="destructive"
						size="sm"
						onClick={() => {
							particleData.behaviors.splice(index, 1);
							onChange();
						}}
						className="mt-2"
					>
						<AiOutlineClose className="w-4 h-4" /> Remove
					</Button>
				</EditorInspectorSectionField>
			))}
		</>
	);
}

export function FXEditorBehaviorsDropdown(props: IFXEditorBehaviorsPropertiesProps): ReactNode {
	const { particleData, onChange } = props;

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={(e) => e.stopPropagation()}>
					<AiOutlinePlus className="w-4 h-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent>
				<DropdownMenuItem
					onClick={() => {
						particleData.behaviors.push({ type: "ApplyForce" });
						onChange();
					}}
				>
					ApplyForce
				</DropdownMenuItem>
				<DropdownMenuItem
					onClick={() => {
						particleData.behaviors.push({ type: "Noise" });
						onChange();
					}}
				>
					Noise
				</DropdownMenuItem>
				<DropdownMenuItem
					onClick={() => {
						particleData.behaviors.push({ type: "TurbulenceField" });
						onChange();
					}}
				>
					TurbulenceField
				</DropdownMenuItem>
				<DropdownMenuItem
					onClick={() => {
						particleData.behaviors.push({ type: "GravityForce" });
						onChange();
					}}
				>
					GravityForce
				</DropdownMenuItem>
				<DropdownMenuItem
					onClick={() => {
						particleData.behaviors.push({ type: "ColorOverLife" });
						onChange();
					}}
				>
					ColorOverLife
				</DropdownMenuItem>
				<DropdownMenuItem
					onClick={() => {
						particleData.behaviors.push({ type: "RotationOverLife" });
						onChange();
					}}
				>
					RotationOverLife
				</DropdownMenuItem>
				<DropdownMenuItem
					onClick={() => {
						particleData.behaviors.push({ type: "Rotation3DOverLife" });
						onChange();
					}}
				>
					Rotation3DOverLife
				</DropdownMenuItem>
				<DropdownMenuItem
					onClick={() => {
						particleData.behaviors.push({ type: "SizeOverLife" });
						onChange();
					}}
				>
					SizeOverLife
				</DropdownMenuItem>
				<DropdownMenuItem
					onClick={() => {
						particleData.behaviors.push({ type: "ColorBySpeed" });
						onChange();
					}}
				>
					ColorBySpeed
				</DropdownMenuItem>
				<DropdownMenuItem
					onClick={() => {
						particleData.behaviors.push({ type: "RotationBySpeed" });
						onChange();
					}}
				>
					RotationBySpeed
				</DropdownMenuItem>
				<DropdownMenuItem
					onClick={() => {
						particleData.behaviors.push({ type: "SizeBySpeed" });
						onChange();
					}}
				>
					SizeBySpeed
				</DropdownMenuItem>
				<DropdownMenuItem
					onClick={() => {
						particleData.behaviors.push({ type: "SpeedOverLife" });
						onChange();
					}}
				>
					SpeedOverLife
				</DropdownMenuItem>
				<DropdownMenuItem
					onClick={() => {
						particleData.behaviors.push({ type: "FrameOverLife" });
						onChange();
					}}
				>
					FrameOverLife
				</DropdownMenuItem>
				<DropdownMenuItem
					onClick={() => {
						particleData.behaviors.push({ type: "ForceOverLife" });
						onChange();
					}}
				>
					ForceOverLife
				</DropdownMenuItem>
				<DropdownMenuItem
					onClick={() => {
						particleData.behaviors.push({ type: "OrbitOverLife" });
						onChange();
					}}
				>
					OrbitOverLife
				</DropdownMenuItem>
				<DropdownMenuItem
					onClick={() => {
						particleData.behaviors.push({ type: "WidthOverLength" });
						onChange();
					}}
				>
					WidthOverLength
				</DropdownMenuItem>
				<DropdownMenuItem
					onClick={() => {
						particleData.behaviors.push({ type: "ChangeEmitDirection" });
						onChange();
					}}
				>
					ChangeEmitDirection
				</DropdownMenuItem>
				<DropdownMenuItem
					onClick={() => {
						particleData.behaviors.push({ type: "EmitSubParticleSystem" });
						onChange();
					}}
				>
					EmitSubParticleSystem
				</DropdownMenuItem>
				<DropdownMenuItem
					onClick={() => {
						particleData.behaviors.push({ type: "LimitSpeedOverLife" });
						onChange();
					}}
				>
					LimitSpeedOverLife
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

