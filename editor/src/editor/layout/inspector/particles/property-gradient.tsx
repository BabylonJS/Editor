import { PropsWithChildren } from "react";

import { AiOutlinePlus } from "react-icons/ai";

import { ParticleSystem, IValueGradient, FactorGradient, ColorGradient, Color3Gradient } from "babylonjs";

import { registerUndoRedo } from "../../../../tools/undoredo";

import { Button } from "../../../../ui/shadcn/ui/button";

import { EditorInspectorBlockField } from "../fields/block";
import { EditorInspectorSwitchField } from "../fields/switch";

import { GradientField } from "./gradient";

export interface IParticleSystemGradientInspectorProps extends PropsWithChildren {
    title?: string;
    label: string;
    particleSystem: ParticleSystem;

    getGradients: () => IValueGradient[] | null;
    createGradient: () => void;
    addGradient: (gradient: number, value1: any, value2?: any) => void;

    onUpdate: () => void;
}

export function ParticleSystemGradientInspector(props: IParticleSystemGradientInspectorProps) {
	const o = {
		value: props.getGradients()?.length ? true : false,
	};

	function handleUseChange(value: boolean) {
		const oldGradients = props.getGradients()?.slice();

		registerUndoRedo({
			executeRedo: true,
			undo: () => {
				if (value) {
					const gradients = props.getGradients();
					gradients?.splice(0, gradients.length);
				} else {
					oldGradients?.forEach((g) => {
						if (g instanceof FactorGradient) {
							return props.addGradient(g.gradient, g.factor1, g.factor2);
						}

						if (g instanceof ColorGradient) {
							return props.addGradient(g.gradient, g.color1, g.color2);
						}

						if (g instanceof Color3Gradient) {
							return props.addGradient(g.gradient, g.color);
						}
					});
				}
			},
			redo: () => {
				if (value) {
					props.createGradient();
				} else {
					const gradients = props.getGradients();
					gradients?.splice(0, gradients.length);
				}
			},
		});

		props.onUpdate();
	}

	function handleRemoveGradient(gradient: IValueGradient) {
		registerUndoRedo({
			executeRedo: true,
			undo: () => {
				const gradients = props.getGradients();
				gradients?.push(gradient);
				gradients?.sort((a, b) => a.gradient - b.gradient);
			},
			redo: () => {
				const gradients = props.getGradients();
				if (gradients?.length) {
					const index = gradients.indexOf(gradient);
					if (index !== -1) {
						gradients.splice(index, 1);
					}
				}
			},
		});

		props.onUpdate();
	}

	function handleAddGradient() {
		let createdGradient: IValueGradient | null = null;
		const lastGradient = props.getGradients()?.sort((a, b) => a.gradient - b.gradient).slice().pop();

		registerUndoRedo({
			executeRedo: true,
			undo: () => {
				const gradients = props.getGradients();
				if (createdGradient && gradients?.length) {
					const index = gradients.indexOf(createdGradient);
					if (index !== -1) {
						gradients.splice(index, 1);
					}
				}
			},
			redo: () => {
				if (lastGradient instanceof FactorGradient) {
					props.addGradient(1, lastGradient.factor1, lastGradient.factor2);
				} else if (lastGradient instanceof ColorGradient) {
					props.addGradient(1, lastGradient.color1.clone(), lastGradient.color2?.clone());
				} else if (lastGradient instanceof Color3Gradient) {
					props.addGradient(1, lastGradient.color);
				}

				createdGradient = props.getGradients()?.slice().pop() ?? null;
			},
		});

		props.onUpdate();
	}

	return (
		<EditorInspectorBlockField>
			{props.title &&
                <div className="px-2">
                	{props.title}
                </div>
			}

			<EditorInspectorSwitchField noUndoRedo object={o} property="value" label={props.label} onChange={(value) => handleUseChange(value)} />

			{!o.value && props.children}

			{o.value &&
                <div className="flex flex-col gap-2">
                	{props.getGradients()?.map((gradient, index) => (
                		<GradientField key={index} gradient={gradient} onRemove={() => handleRemoveGradient(gradient)} />
                	))}

                	<Button variant="ghost" onClick={() => handleAddGradient()} className="w-full hover:bg-secondary transition-all duration-300 ease-in-out">
                		<AiOutlinePlus />
                	</Button>
                </div>
			}
		</EditorInspectorBlockField>
	);
}
