import * as os from "os";

import * as React from "react";
import { Card } from "@blueprintjs/core";

import { IWorkSpace } from "../../../../editor/project/typings";

import { InspectorList } from "../../../../editor/gui/inspector/fields/list";
import { InspectorSection } from "../../../../editor/gui/inspector/fields/section";
import { InspectorBoolean } from "../../../../editor/gui/inspector/fields/boolean";
import { InspectorFileInput } from "../../../../editor/gui/inspector/fields/file-input";

import { IPreferencesPanelProps } from "../../index";

const platform = os.platform();

export class AssetsTexturesPreferencesPanel extends React.Component<IPreferencesPanelProps> {
	/**
	 * Renders the component.
	 */
	public render(): React.ReactNode {
		const workspace = this.props.preferences.state.workspace;
		if (!workspace) {
			return null;
		}

		// Auto-lod
		workspace.autoLod ??= {};
		workspace.autoLod.enabled ??= false;
		workspace.autoLod.autoApply ??= true;

		// PVRTexTool
		workspace.basisCompressedTextures ??= {};
		workspace.basisCompressedTextures.enabled ??= false;

		workspace.ktx2CompressedTextures ??= {};
		workspace.ktx2CompressedTextures.enabled ??= false;
		workspace.ktx2CompressedTextures.forcedFormat ??= "automatic";
		workspace.ktx2CompressedTextures.astcOptions ??= {
			quality: "astcveryfast",
		};
		workspace.ktx2CompressedTextures.pvrtcOptions ??= {
			enabled: false,
			quality: "pvrtcfastest",
		};
		workspace.ktx2CompressedTextures.ect1Options ??= {
			enabled: false,
			quality: "etcfast",
		};
		workspace.ktx2CompressedTextures.ect2Options ??= {
			enabled: false,
			quality: "etcfast",
		};

		if (typeof (workspace.ktx2CompressedTextures.pvrTexToolCliPath) === "string") {
			workspace.ktx2CompressedTextures.pvrTexToolCliPath = { [platform]: workspace.ktx2CompressedTextures.pvrTexToolCliPath };
		} else {
			workspace.ktx2CompressedTextures.pvrTexToolCliPath ??= {};
		}

		// NVidia cli path
		workspace.ktx2CompressedTextures.nvidiaTextureTools ??= {
			cliPath: "",
			enabled: false,
		};

		return (
			<div style={{ width: "70%", height: "100%", margin: "auto" }}>
				{this._getAutoLod(workspace)}
				{this._getBasisCompression(workspace)}
				{this._getKTX2Compression(workspace)}
			</div>
		);
	}

	/**
	 * Returns the inspector used to edit the auto-lod configuration.
	 */
	private _getAutoLod(workspace: IWorkSpace): React.ReactNode {
		return (
			<InspectorSection title="Auto LOD">
				<InspectorBoolean object={workspace.autoLod} property="enabled" label="Enabled" defaultValue={false} />
				<InspectorBoolean object={workspace.autoLod} property="autoApply" label="Automatically Apply" defaultValue={false} />
			</InspectorSection>
		);
	}

	/**
	 * Returns the inspector used to edit the basis compressed textures configuration.
	 */
	private _getBasisCompression(workspace: IWorkSpace): React.ReactNode {
		return (
			<InspectorSection title="KTX2 Compression">
				<InspectorBoolean object={workspace.basisCompressedTextures} property="enabled" label="Enabled" defaultValue={false} />

				<Card title="Information">
					Please note that Basis texture encoding requires KTX Software installed and available on the machine.
				</Card>
			</InspectorSection>
		);
	}

	/**
	 * Returns the inspector used to edit the KTX compressed textures configuration.
	 */
	private _getKTX2Compression(workspace: IWorkSpace): React.ReactNode {
		return (
			<InspectorSection title="KTX2 Compression">
				<InspectorBoolean object={workspace.ktx2CompressedTextures} property="enabled" label="Enabled" defaultValue={false} />
				<InspectorFileInput object={workspace.ktx2CompressedTextures!.pvrTexToolCliPath} property={platform} label="PVRTexToolCLI Path" />

				{/* <InspectorSection title="NVidia Texture Tools">
					<InspectorBoolean object={workspace.ktx2CompressedTextures!.nvidiaTextureTools} property="enabled" label="Enabled" defaultValue={false} />
					<InspectorFileInput object={workspace.ktx2CompressedTextures!.nvidiaTextureTools} property="cliPath" label="NVidia Texture Tools CLI Path" />
				</InspectorSection> */}

				<InspectorSection title="Development">
					<InspectorBoolean object={workspace.ktx2CompressedTextures} property="enabledInPreview" label="Enabled In Preview" defaultValue={false} />
					<InspectorList object={workspace.ktx2CompressedTextures} property="forcedFormat" label="Forced Format" items={[
						{ label: "Automatic", data: "automatic" },
						{ label: "ASTC", data: "-astc.ktx" },
						{ label: "DXT", data: "-dxt.ktx" },
						{ label: "PVRTC", data: "-pvrtc.ktx" },
						{ label: "ETC1", data: "-etc1.ktx" },
						{ label: "ETC2", data: "-etc2.ktx" },
					]} />
				</InspectorSection>

				<InspectorSection title="ASTC">
					<InspectorList object={workspace.ktx2CompressedTextures!.astcOptions} property="quality" label="Quality" items={[
						{ label: "Very Fast", data: "astcveryfast" },
						{ label: "Fast", data: "astcfast" },
						{ label: "Medium", data: "astcmedium" },
						{ label: "Thorough", data: "astcthorough" },
						{ label: "Exhaustive", data: "astcexhaustive" },
					]} />
				</InspectorSection>

				<InspectorSection title="PVRTC">
					<InspectorBoolean object={workspace.ktx2CompressedTextures!.pvrtcOptions} property="enabled" label="Enabled" defaultValue={false} />
					<InspectorList object={workspace.ktx2CompressedTextures!.pvrtcOptions} property="quality" label="Quality" items={[
						{ label: "Fastest", data: "pvrtcfastest" },
						{ label: "Fast", data: "pvrtcfast" },
						{ label: "Low", data: "pvrtclow" },
						{ label: "Normal", data: "pvrtcnormal" },
						{ label: "High", data: "pvrtchigh" },
						{ label: "Very High", data: "pvrtcveryhigh" },
						{ label: "Thorough", data: "pvrtcthorough" },
						{ label: "Best", data: "pvrtcbest" },
					]} />
				</InspectorSection>

				<InspectorSection title="ETC1">
					<InspectorBoolean object={workspace.ktx2CompressedTextures!.ect1Options} property="enabled" label="Enabled" defaultValue={false} />
					<InspectorList object={workspace.ktx2CompressedTextures!.ect1Options} property="quality" label="Quality" items={[
						{ label: "Fast", data: "etcfast" },
						{ label: "Normal", data: "etcnormal" },
						{ label: "Slow", data: "etcslow" },
					]} />
				</InspectorSection>

				<InspectorSection title="ETC2">
					<InspectorBoolean object={workspace.ktx2CompressedTextures!.ect2Options} property="enabled" label="Enabled" defaultValue={false} />
					<InspectorList object={workspace.ktx2CompressedTextures!.ect2Options} property="quality" label="Quality" items={[
						{ label: "Fast", data: "etcfast" },
						{ label: "Normal", data: "etcnormal" },
						{ label: "Slow", data: "etcslow" },
					]} />
				</InspectorSection>
			</InspectorSection>
		);
	}
}
