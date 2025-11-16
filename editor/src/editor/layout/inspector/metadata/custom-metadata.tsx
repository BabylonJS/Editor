import { Component, ReactNode } from "react";

import { IoAddSharp, IoCloseOutline } from "react-icons/io5";

import { Node } from "babylonjs";

import { showAlert, showPrompt } from "../../../../ui/dialog";
import { Button } from "../../../../ui/shadcn/ui/button";

import { EditorInspectorStringField } from "../fields/string";
import { EditorInspectorSectionField } from "../fields/section";

export interface ICustomMetadataInspectorProps {
	object: Node;
}

/**
 * Custom metadata inspector component that allows users to add/edit/remove key-value pairs
 * for custom metadata on nodes.
 */
export class CustomMetadataInspector extends Component<ICustomMetadataInspectorProps> {
	public render(): ReactNode {
		
		const keys = Object.keys(this.props.object.metadata?.customMetadata ?? {});

		return (
			<EditorInspectorSectionField title="Metadata">
				{keys.length === 0 && (
					<div className="text-center text-white/50 py-2">
						No metadata found. Click "Add" to create a new key-value pair.
					</div>
				)}

				{keys.map((key, index) => (
					<div key={index} className="flex items-center gap-2">
						<div className="w-full">
							<EditorInspectorStringField
								label={key}
								object={this.props.object.metadata?.customMetadata ?? {}}
								property={key}
								onChange={() => this.forceUpdate()}
							/>
						</div>

						<Button
							variant="secondary"
							className="p-2"
							onClick={() => this._handleRemoveKey(key)}
						>
							<IoCloseOutline className="w-4 h-4" />
						</Button>
					</div>
				))}

				<Button
					variant="secondary"
					className="flex items-center gap-2 w-full"
					onClick={() => this._handleAddKey()}
				>
					<IoAddSharp className="w-6 h-6" /> Add
				</Button>
			</EditorInspectorSectionField>
		);
	}

	private async _handleAddKey(): Promise<void> {
		const key = await showPrompt("Add Custom Metadata", "Enter the key name for the new metadata:");

		if (!key) {
			return;
		}

		// Validate key name
		if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
			showAlert("Invalid Key Name", "Key must start with a letter or underscore and contain only letters, numbers, and underscores.");
			return;
		}

		// Ensure metadata exists
		if (!this.props.object.metadata) {
			this.props.object.metadata = {};
		}

		// Ensure customMetadata exists
		if (!this.props.object.metadata.customMetadata) {
			this.props.object.metadata.customMetadata = {};
		}

		// Check if key already exists
		if (key in this.props.object.metadata.customMetadata) {
			showAlert("Duplicate Key", `Key "${key}" already exists.`);
			return;
		}

		// Add new key with empty string value
		this.props.object.metadata.customMetadata[key] = "";

		this.forceUpdate();
	}

	private _handleRemoveKey(key: string): void {
		if (!this.props.object.metadata?.customMetadata) {
			return;
		}

		delete this.props.object.metadata.customMetadata[key];

		// Clean up empty customMetadata object
		if (Object.keys(this.props.object.metadata.customMetadata).length === 0) {
			delete this.props.object.metadata.customMetadata;
		}

		this.forceUpdate();
	}
}
