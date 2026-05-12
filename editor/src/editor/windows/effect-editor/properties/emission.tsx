import { ReactNode } from "react";

import { EditorInspectorNumberField } from "../../../layout/inspector/fields/number";
import { EditorInspectorSwitchField } from "../../../layout/inspector/fields/switch";
import { EditorInspectorListField } from "../../../layout/inspector/fields/list";
import { EditorInspectorSectionField } from "../../../layout/inspector/fields/section";

import { type Value, parseConstantValue } from "../types";
import { EffectValueEditor } from "../editors/value";
import type { IQuarksNode } from "../quarks-bridge";
import {
	ConeEmitter,
	ConstantValue,
	EmitterMode,
	HemisphereEmitter,
	type ParticleSystem,
	PointEmitter,
	RectangleEmitter,
	SphereEmitter,
	type BurstParameters,
} from "babylon.quarks";
import { createConstantValue, editorValueToGenerator, generatorToEditorValue } from "../quarks-adapter";

export interface IEffectEditorEmissionPropertiesProps {
	nodeData: IQuarksNode;
	onChange: () => void;
}

interface IEmissionBurst {
	id: string;
	time: Value;
	count: Value;
	cycle: number;
	interval: number;
	probability: number;
}

const burstEditorState = new WeakMap<ParticleSystem, IEmissionBurst[]>();
const createBurstId = (): string => `burst-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function getEditableBursts(system: ParticleSystem): IEmissionBurst[] {
	const cached = burstEditorState.get(system);
	if (cached) {
		return cached;
	}
	const created = (system.emissionBursts ?? []).map((burst) => ({
		id: createBurstId(),
		time: createConstantValue(Number(burst.time ?? 0)),
		count: generatorToEditorValue(burst.count),
		cycle: Number(burst.cycle ?? 1),
		interval: Number(burst.interval ?? 0),
		probability: Number(burst.probability ?? 1),
	}));
	burstEditorState.set(system, created);
	return created;
}

function applyBursts(system: ParticleSystem, bursts: IEmissionBurst[]): void {
	const runtimeBursts: BurstParameters[] = bursts.map((burst) => ({
		time: parseConstantValue(burst.time, 0),
		count: editorValueToGenerator(burst.count),
		cycle: burst.cycle,
		interval: burst.interval,
		probability: burst.probability,
	}));
	system.emissionBursts = runtimeBursts;
	system.neededToUpdateRender = true;
	burstEditorState.set(system, bursts);
}

type ShapeKey = "point" | "sphere" | "cone" | "hemisphere" | "rectangle";

function getShapeKey(system: ParticleSystem): ShapeKey {
	const shape = system.emitterShape;
	if (shape instanceof SphereEmitter) {
		return "sphere";
	}
	if (shape instanceof ConeEmitter) {
		return "cone";
	}
	if (shape instanceof HemisphereEmitter) {
		return "hemisphere";
	}
	if (shape instanceof RectangleEmitter) {
		return "rectangle";
	}
	return "point";
}

function setShape(system: ParticleSystem, shape: ShapeKey): void {
	const current = system.emitterShape;
	switch (shape) {
		case "sphere":
			system.emitterShape = new SphereEmitter({
				radius: current instanceof SphereEmitter ? current.radius : 1,
				arc: current instanceof SphereEmitter ? current.arc : Math.PI * 2,
				thickness: current instanceof SphereEmitter ? current.thickness : 1,
				mode: current instanceof SphereEmitter ? current.mode : EmitterMode.Random,
				spread: current instanceof SphereEmitter ? current.spread : 0,
				speed: current instanceof SphereEmitter ? current.speed : new ConstantValue(1),
			});
			break;
		case "cone":
			system.emitterShape = new ConeEmitter({
				radius: current instanceof ConeEmitter ? current.radius : 1,
				arc: current instanceof ConeEmitter ? current.arc : Math.PI * 2,
				thickness: current instanceof ConeEmitter ? current.thickness : 1,
				angle: current instanceof ConeEmitter ? current.angle : Math.PI / 6,
				mode: current instanceof ConeEmitter ? current.mode : EmitterMode.Random,
				spread: current instanceof ConeEmitter ? current.spread : 0,
				speed: current instanceof ConeEmitter ? current.speed : new ConstantValue(1),
			});
			break;
		case "hemisphere":
			system.emitterShape = new HemisphereEmitter({
				radius: current instanceof HemisphereEmitter ? current.radius : 1,
				arc: current instanceof HemisphereEmitter ? current.arc : Math.PI * 2,
				thickness: current instanceof HemisphereEmitter ? current.thickness : 1,
				mode: current instanceof HemisphereEmitter ? current.mode : EmitterMode.Random,
				spread: current instanceof HemisphereEmitter ? current.spread : 0,
				speed: current instanceof HemisphereEmitter ? current.speed : new ConstantValue(1),
			});
			break;
		case "rectangle":
			system.emitterShape = new RectangleEmitter({
				width: current instanceof RectangleEmitter ? current.width : 1,
				height: current instanceof RectangleEmitter ? current.height : 1,
				thickness: current instanceof RectangleEmitter ? current.thickness : 1,
				mode: current instanceof RectangleEmitter ? current.mode : EmitterMode.Random,
				spread: current instanceof RectangleEmitter ? current.spread : 0,
				speed: current instanceof RectangleEmitter ? current.speed : new ConstantValue(1),
			});
			break;
		case "point":
		default:
			system.emitterShape = new PointEmitter();
			break;
	}
	system.neededToUpdateRender = true;
}

function renderEmitterShape(system: ParticleSystem, onChange: () => void): ReactNode {
	const shape = system.emitterShape;
	const shapeType = getShapeKey(system);

	return (
		<>
			<EditorInspectorListField
				object={{ shapeType }}
				property="shapeType"
				label="Shape"
				items={[
					{ text: "Point", value: "point" },
					{ text: "Sphere", value: "sphere" },
					{ text: "Cone", value: "cone" },
					{ text: "Hemisphere", value: "hemisphere" },
					{ text: "Rectangle", value: "rectangle" },
				]}
				onChange={(value) => {
					setShape(system, value as ShapeKey);
					onChange();
				}}
			/>

			{shape instanceof SphereEmitter && (
				<>
					<EditorInspectorNumberField object={shape} property="radius" label="Radius" min={0} step={0.1} onChange={onChange} />
					<EditorInspectorNumberField object={shape} property="arc" label="Arc" min={0} max={Math.PI * 2} step={0.1} onChange={onChange} />
					<EditorInspectorNumberField object={shape} property="thickness" label="Thickness" min={0} max={1} step={0.01} onChange={onChange} />
					<EditorInspectorListField
						object={shape}
						property="mode"
						label="Mode"
						items={[
							{ text: "Random", value: EmitterMode.Random },
							{ text: "Loop", value: EmitterMode.Loop },
							{ text: "PingPong", value: EmitterMode.PingPong },
							{ text: "Burst", value: EmitterMode.Burst },
						]}
						onChange={onChange}
					/>
					<EditorInspectorNumberField object={shape} property="spread" label="Spread" min={0} max={1} step={0.01} onChange={onChange} />
					<EffectValueEditor
						label="Speed"
						value={generatorToEditorValue(shape.speed)}
						onChange={(value) => {
							shape.speed = editorValueToGenerator(value as Value);
							onChange();
						}}
					/>
				</>
			)}

			{shape instanceof ConeEmitter && (
				<>
					<EditorInspectorNumberField object={shape} property="radius" label="Radius" min={0} step={0.1} onChange={onChange} />
					<EditorInspectorNumberField object={shape} property="arc" label="Arc" min={0} max={Math.PI * 2} step={0.1} onChange={onChange} />
					<EditorInspectorNumberField object={shape} property="thickness" label="Thickness" min={0} max={1} step={0.01} onChange={onChange} />
					<EditorInspectorNumberField object={shape} property="angle" label="Angle" min={0} max={Math.PI} step={0.1} onChange={onChange} />
					<EditorInspectorListField
						object={shape}
						property="mode"
						label="Mode"
						items={[
							{ text: "Random", value: EmitterMode.Random },
							{ text: "Loop", value: EmitterMode.Loop },
							{ text: "PingPong", value: EmitterMode.PingPong },
							{ text: "Burst", value: EmitterMode.Burst },
						]}
						onChange={onChange}
					/>
					<EditorInspectorNumberField object={shape} property="spread" label="Spread" min={0} max={1} step={0.01} onChange={onChange} />
					<EffectValueEditor
						label="Speed"
						value={generatorToEditorValue(shape.speed)}
						onChange={(value) => {
							shape.speed = editorValueToGenerator(value as Value);
							onChange();
						}}
					/>
				</>
			)}

			{shape instanceof HemisphereEmitter && (
				<>
					<EditorInspectorNumberField object={shape} property="radius" label="Radius" min={0} step={0.1} onChange={onChange} />
					<EditorInspectorNumberField object={shape} property="arc" label="Arc" min={0} max={Math.PI * 2} step={0.1} onChange={onChange} />
					<EditorInspectorNumberField object={shape} property="thickness" label="Thickness" min={0} max={1} step={0.01} onChange={onChange} />
					<EditorInspectorListField
						object={shape}
						property="mode"
						label="Mode"
						items={[
							{ text: "Random", value: EmitterMode.Random },
							{ text: "Loop", value: EmitterMode.Loop },
							{ text: "PingPong", value: EmitterMode.PingPong },
							{ text: "Burst", value: EmitterMode.Burst },
						]}
						onChange={onChange}
					/>
					<EditorInspectorNumberField object={shape} property="spread" label="Spread" min={0} max={1} step={0.01} onChange={onChange} />
					<EffectValueEditor
						label="Speed"
						value={generatorToEditorValue(shape.speed)}
						onChange={(value) => {
							shape.speed = editorValueToGenerator(value as Value);
							onChange();
						}}
					/>
				</>
			)}

			{shape instanceof RectangleEmitter && (
				<>
					<EditorInspectorNumberField object={shape} property="width" label="Width" min={0} step={0.1} onChange={onChange} />
					<EditorInspectorNumberField object={shape} property="height" label="Height" min={0} step={0.1} onChange={onChange} />
					<EditorInspectorNumberField object={shape} property="thickness" label="Thickness" min={0} max={1} step={0.01} onChange={onChange} />
					<EditorInspectorListField
						object={shape}
						property="mode"
						label="Mode"
						items={[
							{ text: "Random", value: EmitterMode.Random },
							{ text: "Loop", value: EmitterMode.Loop },
							{ text: "PingPong", value: EmitterMode.PingPong },
							{ text: "Burst", value: EmitterMode.Burst },
						]}
						onChange={onChange}
					/>
					<EditorInspectorNumberField object={shape} property="spread" label="Spread" min={0} max={1} step={0.01} onChange={onChange} />
					<EffectValueEditor
						label="Speed"
						value={generatorToEditorValue(shape.speed)}
						onChange={(value) => {
							shape.speed = editorValueToGenerator(value as Value);
							onChange();
						}}
					/>
				</>
			)}
		</>
	);
}

/**
 * Renders emission bursts
 */
function renderBursts(system: ParticleSystem, onChange: () => void): ReactNode {
	const bursts = getEditableBursts(system);

	const addBurst = () => {
		const updated = [
			...bursts,
			{
				id: createBurstId(),
				time: createConstantValue(0),
				count: createConstantValue(1),
				cycle: 1,
				interval: 0,
				probability: 1,
			},
		];
		applyBursts(system, updated);
		onChange();
	};

	const removeBurst = (index: number) => {
		const updated = bursts.filter((_, burstIndex) => burstIndex !== index);
		applyBursts(system, updated);
		onChange();
	};

	return (
		<EditorInspectorSectionField title="Bursts">
			<div className="flex flex-col gap-3 px-2">
				{bursts.map((burst, idx) => (
					<div key={burst.id} className="border border-border rounded p-2 flex flex-col gap-2">
						<div className="flex justify-between items-center text-sm font-medium">
							<div>Burst #{idx + 1}</div>
							<button className="text-red-500" onClick={() => removeBurst(idx)}>
								Remove
							</button>
						</div>
						<div className="flex flex-col gap-2">
							<EffectValueEditor
								label="Time"
								value={burst.time as Value}
								onChange={(val) => {
									const updated = [...bursts];
									updated[idx] = { ...burst, time: val as Value };
									applyBursts(system, updated);
									onChange();
								}}
							/>
							<EffectValueEditor
								label="Count"
								value={burst.count as Value}
								onChange={(val) => {
									const updated = [...bursts];
									updated[idx] = { ...burst, count: val as Value };
									applyBursts(system, updated);
									onChange();
								}}
							/>
							<EditorInspectorNumberField
								object={burst as any}
								property="cycle"
								label="Cycle"
								min={0}
								step={1}
								onChange={() => {
									const updated = [...bursts];
									updated[idx] = { ...burst };
									applyBursts(system, updated);
									onChange();
								}}
							/>
							<EditorInspectorNumberField
								object={burst as any}
								property="interval"
								label="Interval"
								min={0}
								step={0.01}
								onChange={() => {
									const updated = [...bursts];
									updated[idx] = { ...burst };
									applyBursts(system, updated);
									onChange();
								}}
							/>
							<EditorInspectorNumberField
								object={burst as any}
								property="probability"
								label="Probability"
								min={0}
								max={1}
								step={0.01}
								onChange={() => {
									const updated = [...bursts];
									updated[idx] = { ...burst };
									applyBursts(system, updated);
									onChange();
								}}
							/>
						</div>
					</div>
				))}
				<button className="px-2 py-1 border border-border rounded" onClick={addBurst}>
					Add Burst
				</button>
			</div>
		</EditorInspectorSectionField>
	);
}

/**
 * Renders emission parameters (looping, duration, emit over time/distance, bursts)
 */
function renderEmissionParameters(nodeData: IQuarksNode, onChange: () => void): ReactNode {
	if (nodeData.type !== "particle" || !nodeData.data) {
		return null;
	}

	const system = nodeData.data as ParticleSystem;
	const durationProxy = {
		get duration() {
			return system.looping ? 0 : system.duration;
		},
		set duration(value: number) {
			if (value === 0) {
				system.looping = true;
				return;
			}
			system.looping = false;
			system.duration = Math.max(0.01, value);
		},
	};

	const loopingProxy = {
		get isLooping() {
			return system.looping;
		},
		set isLooping(value: boolean) {
			if (value) {
				system.looping = true;
			} else if (system.duration <= 0) {
				system.duration = 5;
				system.looping = false;
			}
		},
	};

	return (
		<>
			<EditorInspectorSwitchField object={loopingProxy} property="isLooping" label="Looping" onChange={onChange} />
			<EditorInspectorNumberField object={durationProxy} property="duration" label="Duration" min={0} step={0.1} onChange={onChange} />
			<EditorInspectorSwitchField object={system} property="prewarm" label="Prewarm" onChange={onChange} />

			<EditorInspectorNumberField
				object={{
					get emitRate() {
						return parseConstantValue(generatorToEditorValue(system.emissionOverTime), 0);
					},
					set emitRate(value: number) {
						system.emissionOverTime = new ConstantValue(value);
					},
				}}
				property="emitRate"
				label="Emit Rate"
				min={0}
				step={1}
				onChange={onChange}
			/>

			<EditorInspectorSectionField title="Emit Over Distance">
				<EffectValueEditor
					label="Emit Over Distance"
					value={generatorToEditorValue(system.emissionOverDistance)}
					onChange={(val) => {
						system.emissionOverDistance = editorValueToGenerator(val as Value);
						onChange();
					}}
				/>
			</EditorInspectorSectionField>

			{renderBursts(system as any, onChange)}
		</>
	);
}

/**
 * Combined emission properties component
 * Includes both emitter shape and emission parameters
 */
export function EffectEditorEmissionProperties(props: IEffectEditorEmissionPropertiesProps): ReactNode {
	const { nodeData, onChange } = props;

	if (nodeData.type !== "particle" || !nodeData.data) {
		return null;
	}
	const system = nodeData.data as ParticleSystem;

	return (
		<>
			<EditorInspectorSectionField title="Emitter Shape">{renderEmitterShape(system, onChange)}</EditorInspectorSectionField>

			<EditorInspectorSectionField title="Emission Parameters">{renderEmissionParameters(nodeData, onChange)}</EditorInspectorSectionField>
		</>
	);
}
