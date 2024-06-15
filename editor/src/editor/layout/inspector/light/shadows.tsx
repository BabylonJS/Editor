import { Divider } from "@blueprintjs/core";
import { Component, ReactNode } from "react";

import { CascadedShadowGenerator, DirectionalLight, IShadowGenerator, IShadowLight, ShadowGenerator } from "babylonjs";

import { getPowerOfTwoSizesUntil } from "../../../../tools/tools";
import { isDirectionalLight } from "../../../../tools/guards/nodes";
import { isCascadedShadowGenerator, isShadowGenerator } from "../../../../tools/guards/shadows";

import { EditorInspectorNumberField } from "../fields/number";
import { EditorInspectorListField, IEditorInspectorListFieldItem } from "../fields/list";

export interface IEditorLightShadowsInspectorProps {
    light: IShadowLight;
}

export interface IEditorLightShadowsInspectorState {
    generator: IShadowGenerator | null;
}

export type SoftShadowType = "usePercentageCloserFiltering" | "useContactHardeningShadow" | "none";

export class EditorLightShadowsInspector extends Component<IEditorLightShadowsInspectorProps, IEditorLightShadowsInspectorState> {
    protected _generatorSize: number = 1024;
    protected _generatorType: string = "none";

    protected _softShadowType: SoftShadowType = "none";

    protected _sizes: IEditorInspectorListFieldItem[] = getPowerOfTwoSizesUntil(4096, 256).map((s) => ({
        value: s,
        text: `${s}px`,
    } as IEditorInspectorListFieldItem));

    public constructor(props: IEditorLightShadowsInspectorProps) {
        super(props);

        this.state = {
            generator: null,
        };
    }

    public render(): ReactNode {
        return (
            <>
                {this._getEmptyShadowGeneratorComponent()}
                {this._getClassicShadowGeneratorComponent()}
                {this._getCascadedShadowGeneratorComponent()}
            </>
        );
    }

    public componentDidMount(): void {
        this._refreshShadowGenerator();
    }

    private _refreshShadowGenerator(): void {
        const generator = this.props.light.getShadowGenerator();

        this._generatorType = !generator
            ? "none"
            : isCascadedShadowGenerator(generator)
                ? "cascaded"
                : "classic";

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

        const generator = type === "classic"
            ? new ShadowGenerator(mapSize?.width ?? 1024, this.props.light, true)
            : new CascadedShadowGenerator(mapSize?.width ?? 1024, this.props.light as DirectionalLight, true);

        if (renderList) {
            generator.getShadowMap()?.renderList?.push(...renderList);
        } else {
            generator.getShadowMap()?.renderList?.push(...generator.getLight().getScene().meshes);
        }

        this._refreshShadowGenerator();
    }

    private _reszeShadowGenerator(size: number): void {
        this.state.generator?.getShadowMap()?.resize(size);
    }

    private _getEmptyShadowGeneratorComponent(): ReactNode {
        if (this.state.generator) {
            return (
                <>
                    <EditorInspectorListField object={this} property="_generatorType" label="Generator Type" onChange={(v) => this._createShadowGenerator(v)} items={[
                        { text: "None", value: "none" },
                        { text: "Classic", value: "classic" },
                        { text: "Cascaded", value: "cascaded" },
                    ]} />
                    <EditorInspectorListField object={this} property="_generatorSize" label="Generator Size" onChange={(v) => this._reszeShadowGenerator(v)} items={this._sizes} />
                    <Divider />
                </>
            );
        }

        return (
            <EditorInspectorListField object={this} property="_generatorType" label="Generator Type" onChange={(v) => this._createShadowGenerator(v)} items={[
                { text: "None", value: "none" },
                { text: "Classic", value: "classic" },
                { text: "Cascaded", value: "cascaded" },
            ]} />
        );
    }

    private _getClassicShadowGeneratorComponent() {
        const generator = this.state.generator as ShadowGenerator;

        if (!generator || isCascadedShadowGenerator(generator)) {
            return null;
        }

        return (
            <>
                <EditorInspectorNumberField object={generator} property="bias" step={0.000001} min={0} max={1} label="Bias" />
                <EditorInspectorNumberField object={generator} property="normalBias" step={0.000001} min={0} max={1} label="Normal Bias" />

                <EditorInspectorListField object={this} property="_softShadowType" label="Soft Shadows Type" onChange={(v) => this._updateSoftShadowType(v)} items={[
                    { text: "None", value: "none" },
                    { text: "Percentage Closer Filtering", value: "usePercentageCloserFiltering" },
                    { text: "Contact Hardening Shadow", value: "useContactHardeningShadow" },
                ]} />
            </>
        );
    }

    private _getCascadedShadowGeneratorComponent() {
        const generator = this.state.generator;

        if (!generator || !isCascadedShadowGenerator(generator)) {
            return null;
        }

        return (
            <>
                <EditorInspectorNumberField object={this.state.generator} property="lambda" min={0} max={1} label="Lambda" />
                <EditorInspectorNumberField object={this.state.generator} property="bias" step={0.000001} min={0} max={1} label="Bias" />
                <EditorInspectorNumberField object={this.state.generator} property="darkness" min={0} max={1} label="Darkness" />
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
        }
    }
}
