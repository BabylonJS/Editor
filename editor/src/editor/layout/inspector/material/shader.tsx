import { ReactNode } from "react";

import { AbstractMesh, BaseTexture, Scene, ShaderMaterial } from "babylonjs";

import { EditorInspectorSectionField } from "../fields/section";
import { EditorInspectorStringField } from "../fields/string";
import { EditorInspectorNumberField } from "../fields/number";
import { EditorInspectorSwitchField } from "../fields/switch";
import { EditorInspectorTextureField } from "../fields/texture";

import { EditorAlphaModeField } from "./components/alpha";
import { EditorMaterialInspectorUtilsComponent } from "./components/utils";

type ShaderMaterialPrivateViews = {
	_textures?: Record<string, BaseTexture>;
	_options?: { samplers?: string[] };
};

function asShaderInternals(material: ShaderMaterial): ShaderMaterialPrivateViews {
	return material as unknown as ShaderMaterialPrivateViews;
}

function getShaderTextureSlotNames(material: ShaderMaterial): string[] {
	const m = asShaderInternals(material);
	const fromOptions = m._options?.samplers?.filter((s): s is string => typeof s === "string" && s.length > 0) ?? [];
	const fromTex = Object.keys(m._textures ?? {});
	const seen = new Set<string>();
	const ordered: string[] = [];
	for (const k of fromOptions) {
		if (!seen.has(k)) {
			seen.add(k);
			ordered.push(k);
		}
	}
	for (const k of fromTex) {
		if (!seen.has(k)) {
			seen.add(k);
			ordered.push(k);
		}
	}
	return ordered;
}

export interface IEditorShaderMaterialInspectorProps {
	mesh?: AbstractMesh;
	material: ShaderMaterial;
	scene: Scene;
	onChange?: () => void;
}

export function EditorShaderMaterialInspector(props: IEditorShaderMaterialInspectorProps): ReactNode {
	const { material, mesh, scene, onChange } = props;
	const slots = getShaderTextureSlotNames(material);

	return (
		<>
			<EditorInspectorSectionField title="Material" label={material.getClassName()}>
				<EditorInspectorStringField label="Name" object={material} property="name" onChange={() => onChange?.()} />
				<EditorInspectorNumberField label="Alpha" object={material} property="alpha" min={0} max={1} onChange={() => onChange?.()} />
				<EditorInspectorSwitchField label="Back Face Culling" object={material} property="backFaceCulling" onChange={() => onChange?.()} />
				<EditorAlphaModeField object={material} onChange={() => onChange?.()} />
				<EditorMaterialInspectorUtilsComponent mesh={mesh} material={material} />
			</EditorInspectorSectionField>

			{slots.length > 0 && (
				<EditorInspectorSectionField title="Shader textures">
					{slots.map((slot) => (
						<ShaderTextureSlotField key={slot} material={material} slot={slot} scene={scene} onChange={() => onChange?.()} />
					))}
				</EditorInspectorSectionField>
			)}
		</>
	);
}

function ShaderTextureSlotField(props: { material: ShaderMaterial; slot: string; scene: Scene; onChange: () => void }): ReactNode {
	const { material, slot, scene, onChange } = props;
	const proxy = {
		get tex() {
			return asShaderInternals(material)._textures?.[slot] ?? null;
		},
		set tex(value: BaseTexture | null) {
			if (value) {
				material.setTexture(slot, value);
			} else {
				material.removeTexture(slot);
			}
			onChange();
		},
	};

	return <EditorInspectorTextureField object={proxy} property="tex" title={slot} scene={scene} onChange={onChange} />;
}
