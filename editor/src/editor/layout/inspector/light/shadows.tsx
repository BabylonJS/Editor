import { Divider } from "@blueprintjs/core";
import { Component, PropsWithChildren, ReactNode } from "react";

import { CascadedShadowGenerator, DirectionalLight, IShadowGenerator, IShadowLight, RenderTargetTexture, ShadowGenerator } from "babylonjs";

import { waitNextAnimationFrame } from "../../../../tools/tools";
import { getPowerOfTwoSizesUntil } from "../../../../tools/maths/scalar";
import { isDirectionalLight, isPointLight } from "../../../../tools/guards/nodes";
import { isCascadedShadowGenerator, isShadowGenerator } from "../../../../tools/guards/shadows";
import { updateLightShadowMapRefreshRate, updatePointLightShadowMapRenderListPredicate } from "../../../../tools/light/shadows";

import { EditorInspectorNumberField } from "../fields/number";
import { EditorInspectorSwitchField } from "../fields/switch";
import { EditorInspectorSectionField } from "../fields/section";
import { EditorInspectorListField, IEditorInspectorListFieldItem } from "../fields/list";

export interface IEditorLightShadowsInspectorProps extends PropsWithChildren {
	light: IShadowLight;
}

export interface IEditorLightShadowsInspectorState {
	generator: IShadowGenerator | null;
}

export type SoftShadowType =
	| "usePoissonSampling"
	| "useExponentialShadowMap"
	| "useCloseExponentialShadowMap"
	| "usePercentageCloserFiltering"
	| "useContactHardeningShadow"
	| "none";

export class EditorLightShadowsInspector extends Component<IEditorLightShadowsInspectorProps, IEditorLightShadowsInspectorState> {
	protected _generatorSize: number = 1024;
	protected _generatorType: string = "none";

	protected _softShadowType: SoftShadowType = "none";

	protected _sizes: IEditorInspectorListFieldItem[] = getPowerOfTwoSizesUntil(4096, 256).map(
		(s) =>
			({
				value: s,
				text: `${s}px`,
			}) as IEditorInspectorListFieldItem
	);

	public constructor(props: IEditorLightShadowsInspectorProps) {
		super(props);

		this.state = {
			generator: null,
		};
	}

	public render(): ReactNode {
		return (
			<>
				<EditorInspectorSectionField title="Shadows">
					{this._getEmptyShadowGeneratorComponent()}
					{this._getClassicShadowGeneratorComponent()}
					{this._getCascadedShadowGeneratorComponent()}
				</EditorInspectorSectionField>

				{this._getClassicSoftShadowComponent()}
			</>
		);
	}

	public componentDidMount(): void {
		this._refreshShadowGenerator();
	}

	private _refreshShadowGenerator(): void {
		const generator = this.props.light.getShadowGenerator();

		this._generatorType = !generator ? "none" : isCascadedShadowGenerator(generator) ? "cascaded" : "classic";

		this._softShadowType = this._getSoftShadowType(generator);
		this._generatorSize = generator?.getShadowMap()?.getSize().width ?? 1024;

		this.setState({ generator });
	}

	private _createShadowGenerator(type: "none" | "classic" | "cascaded"): void {
		const mapSize = this.state.generator?.getShadowMap()?.getSize();
		const renderList = this.state.generator?.getShadowMap()?.renderList?.slice(0);

		this.state.generator?.dispose();

		if (type === "none") {
			return this._refreshShadowGenerator();
		}

		if (!isDirectionalLight(this.props.light)) {
			type = "classic";
		}

		const generator =
			type === "classic"
				? new ShadowGenerator(mapSize?.width ?? 1024, this.props.light, true)
				: new CascadedShadowGenerator(mapSize?.width ?? 1024, this.props.light as DirectionalLight, true);

		if (isCascadedShadowGenerator(generator)) {
			generator.lambda = 1;
			generator.depthClamp = true;
			generator.autoCalcDepthBounds = true;
			generator.autoCalcDepthBoundsRefreshRate = 60;
		}

		if (!isPointLight(this.props.light)) {
			generator.usePercentageCloserFiltering = true;
			generator.filteringQuality = ShadowGenerator.QUALITY_HIGH;
		}

		generator.transparencyShadow = true;
		generator.enableSoftTransparentShadow = true;

		if (renderList) {
			generator.getShadowMap()?.renderList?.push(...renderList);
		} else {
			generator.getShadowMap()?.renderList?.push(...generator.getLight().getScene().meshes);
		}

		this._refreshShadowGenerator();
	}

	private _reszeShadowGenerator(size: number): void {
		const shadowMap = this.state.generator?.getShadowMap();
		if (shadowMap) {
			const refreshRate = shadowMap.refreshRate;
			shadowMap.resize(size);

			waitNextAnimationFrame().then(() => {
				updatePointLightShadowMapRenderListPredicate(this.props.light);

				const newShadowMap = this.state.generator?.getShadowMap();
				if (newShadowMap) {
					newShadowMap.refreshRate = refreshRate;
				}
			});
		}
	}

	private _getEmptyShadowGeneratorComponent(): ReactNode {
		if (this.state.generator) {
			return (
				<>
					<EditorInspectorListField
						object={this}
						property="_generatorType"
						label="Generator Type"
						onChange={(v) => this._createShadowGenerator(v)}
						items={[
							{ text: "None", value: "none" },
							{ text: "Classic", value: "classic" },
							{ text: "Cascaded", value: "cascaded" },
						]}
					/>
					<EditorInspectorListField object={this} property="_generatorSize" label="Generator Size" onChange={(v) => this._reszeShadowGenerator(v)} items={this._sizes} />
					<Divider />
				</>
			);
		}

		return (
			<EditorInspectorListField
				object={this}
				property="_generatorType"
				label="Generator Type"
				onChange={(v) => this._createShadowGenerator(v)}
				items={[
					{ text: "None", value: "none" },
					{ text: "Classic", value: "classic" },
					{ text: "Cascaded", value: "cascaded" },
				]}
			/>
		);
	}

	private _getClassicShadowGeneratorComponent() {
		const generator = this.state.generator as ShadowGenerator;

		if (!generator) {
			return null;
		}

		const shadowMap = generator.getShadowMap();

		return (
			<>
				{this.props.children}
				<EditorInspectorNumberField
					object={generator}
					property="bias"
					step={0.000001}
					min={0}
					max={1}
					label="Bias"
					onChange={() => updateLightShadowMapRefreshRate(this.props.light)}
				/>
				<EditorInspectorNumberField
					object={generator}
					property="normalBias"
					step={0.000001}
					min={0}
					max={1}
					label="Normal Bias"
					onChange={() => updateLightShadowMapRefreshRate(this.props.light)}
				/>
				<EditorInspectorNumberField object={generator} property="darkness" step={0.01} min={0} max={1} label="Darkness" />

				{shadowMap && (
					<EditorInspectorListField
						object={shadowMap}
						property="refreshRate"
						label="Refresh Rate"
						items={[
							{ text: "Once", value: RenderTargetTexture.REFRESHRATE_RENDER_ONCE },
							{ text: "2 Frames", value: RenderTargetTexture.REFRESHRATE_RENDER_ONEVERYTWOFRAMES },
							{ text: "Every Frame", value: RenderTargetTexture.REFRESHRATE_RENDER_ONEVERYFRAME },
						]}
					/>
				)}
			</>
		);
	}

	private _getClassicSoftShadowComponent() {
		const generator = this.state.generator as ShadowGenerator | CascadedShadowGenerator;

		if (!generator) {
			return null;
		}

		return (
			<EditorInspectorSectionField title="Soft Shadows">
				<EditorInspectorListField
					object={this}
					property="_softShadowType"
					label="Soft Shadows Type"
					onChange={(v) => {
						this._updateSoftShadowType(v);
						updateLightShadowMapRefreshRate(this.props.light);
					}}
					items={[
						{ text: "None", value: "none" },
						...(isPointLight(this.props.light)
							? [{ text: "Poisson Sampling", value: "usePoissonSampling" }]
							: [
									{ text: "Percentage Closer Filtering", value: "usePercentageCloserFiltering" },
									{ text: "Contact Hardening Shadow", value: "useContactHardeningShadow" },
								]),
					]}
				/>

				{generator.usePoissonSampling && <EditorInspectorNumberField object={generator} property="blurScale" step={0.1} min={0} max={10} label="Blur Scale" />}

				{generator.usePercentageCloserFiltering && !generator.useContactHardeningShadow && (
					<>
						<EditorInspectorListField
							object={generator}
							property="filteringQuality"
							label="Filtering Quality"
							items={[
								{ text: "Low", value: ShadowGenerator.QUALITY_LOW },
								{ text: "Medium", value: ShadowGenerator.QUALITY_MEDIUM },
								{ text: "High", value: ShadowGenerator.QUALITY_HIGH },
							]}
							onChange={() => updateLightShadowMapRefreshRate(this.props.light)}
						/>
					</>
				)}

				{generator.useContactHardeningShadow && (
					<EditorInspectorNumberField
						object={generator.contactHardeningLightSizeUVRatio}
						property="blurScale"
						step={0.001}
						min={0}
						max={1}
						label="Light Size UV Ratio"
						onChange={() => updateLightShadowMapRefreshRate(this.props.light)}
					/>
				)}

				<EditorInspectorSwitchField object={generator} property="transparencyShadow" label="Enable Transparency Shadow" />
				<EditorInspectorSwitchField object={generator} property="enableSoftTransparentShadow" label="Enable Soft Transparent Shadow" />
			</EditorInspectorSectionField>
		);
	}

	private _getCascadedShadowGeneratorComponent() {
		const generator = this.state.generator;

		if (!generator || !isCascadedShadowGenerator(generator)) {
			return null;
		}

		return (
			<>
				{this.props.children}
				<EditorInspectorSwitchField
					object={generator}
					property="stabilizeCascades"
					label="Stabilize Cascades"
					onChange={() => updateLightShadowMapRefreshRate(this.props.light)}
				/>
				<EditorInspectorSwitchField object={generator} property="depthClamp" label="Depth Clamp" onChange={() => updateLightShadowMapRefreshRate(this.props.light)} />
				<EditorInspectorSwitchField
					object={generator}
					property="autoCalcDepthBounds"
					label="Auto Calc Depth Bounds"
					onChange={() => {
						this.forceUpdate();
						updateLightShadowMapRefreshRate(this.props.light);
					}}
				/>
				{generator.autoCalcDepthBounds && (
					<EditorInspectorNumberField
						object={generator}
						property="autoCalcDepthBoundsRefreshRate"
						step={1}
						min={0}
						max={60}
						label="Auto Calc Depth Bounds Refresh Rate"
						onChange={() => updateLightShadowMapRefreshRate(this.props.light)}
					/>
				)}
				<EditorInspectorNumberField
					object={generator}
					property="lambda"
					min={0}
					max={1}
					label="Lambda"
					onChange={() => updateLightShadowMapRefreshRate(this.props.light)}
				/>
				<EditorInspectorNumberField
					object={generator}
					property="cascadeBlendPercentage"
					min={0}
					max={1}
					label="Blend Percentage"
					onChange={() => updateLightShadowMapRefreshRate(this.props.light)}
				/>
				<EditorInspectorNumberField
					object={generator}
					property="penumbraDarkness"
					min={0}
					max={1}
					label="Penumbra Darkness"
					onChange={() => updateLightShadowMapRefreshRate(this.props.light)}
				/>

				<EditorInspectorSwitchField object={generator} property="transparencyShadow" label="Enable Transparency Shadow" />
				<EditorInspectorSwitchField object={generator} property="enableSoftTransparentShadow" label="Enable Soft Transparent Shadow" />
			</>
		);
	}

	private _getSoftShadowType(generator: IShadowGenerator | null): SoftShadowType {
		if (generator && (isShadowGenerator(generator) || isCascadedShadowGenerator(generator))) {
			if (generator.usePercentageCloserFiltering) {
				return "usePercentageCloserFiltering";
			} else if (generator.useContactHardeningShadow) {
				return "useContactHardeningShadow";
			}
		}

		return "none";
	}

	private _updateSoftShadowType(type: SoftShadowType): void {
		if (this.state.generator && (isShadowGenerator(this.state.generator) || isCascadedShadowGenerator(this.state.generator))) {
			this.state.generator.usePoissonSampling = false;
			this.state.generator.useExponentialShadowMap = false;
			this.state.generator.useBlurExponentialShadowMap = false;
			this.state.generator.useCloseExponentialShadowMap = false;
			this.state.generator.useBlurCloseExponentialShadowMap = false;
			this.state.generator.usePercentageCloserFiltering = false;
			this.state.generator.useContactHardeningShadow = false;

			this.state.generator[type] = true;

			this.forceUpdate();
		}
	}
}
