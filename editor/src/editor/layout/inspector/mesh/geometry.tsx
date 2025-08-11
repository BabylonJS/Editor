import { toast } from "sonner";

import { HeightMapUtils } from "../../../../tools/mesh/height-map";
import { Component, ReactNode } from "react";

import { CreateBoxVertexData, CreateSphereVertexData, Mesh, Texture, CubeTexture, ColorGradingTexture } from "babylonjs";

import { EditorInspectorListField } from "../fields/list";
import { EditorInspectorNumberField } from "../fields/number";
import { EditorInspectorSectionField } from "../fields/section";
import { EditorInspectorTextureField } from "../fields/texture";
import { EditorInspectorSwitchField } from "../fields/switch";

import { onNodeModifiedObservable } from "../../../../tools/observables";

export interface IMeshGeometryInspectorProps {
	object: Mesh;
}

export class MeshGeometryInspector extends Component<IMeshGeometryInspectorProps> {
	private static readonly _maxSubdivisions = 1024;

	public render(): ReactNode {
		if (this.props.object.metadata?.type === "Box") {
			return this._getBoxInspectorComponent();
		}

		if (this.props.object.metadata?.type === "Sphere") {
			return this._getSphereInspectorComponent();
		}

		if (this.props.object.metadata?.type === "Ground") {
			return this._getGroundInspectorComponent();
		}

		return null;
	}

	private _getBoxInspectorComponent(): ReactNode {
		const proxy = this._getProxy(() => {
			this.props.object.geometry?.setAllVerticesData(
				CreateBoxVertexData({
					width: this.props.object.metadata.width,
					height: this.props.object.metadata.height,
					depth: this.props.object.metadata.depth,
					sideOrientation: this.props.object.metadata.sideOrientation,
				}),
				false
			);
		});

		return (
			<EditorInspectorSectionField title="Box">
				<EditorInspectorNumberField object={proxy} property="width" label="Width" step={0.1} />
				<EditorInspectorNumberField object={proxy} property="height" label="Height" step={0.1} />
				<EditorInspectorNumberField object={proxy} property="depth" label="Depth" step={0.1} />
				<EditorInspectorListField
					object={proxy}
					property="sideOrientation"
					label="Side Orientation"
					items={[
						{ text: "Front", value: Mesh.FRONTSIDE },
						{ text: "Back", value: Mesh.BACKSIDE },
					]}
				/>
			</EditorInspectorSectionField>
		);
	}

	private _getSphereInspectorComponent(): ReactNode {
		const proxy = this._getProxy(() => {
			this.props.object.geometry?.setAllVerticesData(
				CreateSphereVertexData({
					diameter: this.props.object.metadata.diameter,
					segments: this.props.object.metadata.segments,
					sideOrientation: this.props.object.metadata.sideOrientation,
				}),
				false
			);
		});

		return (
			<EditorInspectorSectionField title="Sphere">
				<EditorInspectorNumberField object={proxy} property="diameter" label="Diameter" step={0.1} min={0.01} />
				<EditorInspectorNumberField object={proxy} property="segments" label="Segments" step={0.1} min={2} />
				<EditorInspectorListField
					object={proxy}
					property="sideOrientation"
					label="Side Orientation"
					items={[
						{ text: "Front", value: Mesh.FRONTSIDE },
						{ text: "Back", value: Mesh.BACKSIDE },
					]}
				/>
			</EditorInspectorSectionField>
		);
	}

	private _getGroundInspectorComponent(): ReactNode {
		// Use HeightMapUtils to prepare the ground mesh for inspection
		this.props.object.metadata = HeightMapUtils.prepareGroundForInspector(this.props.object, this.props.object.metadata, MeshGeometryInspector._maxSubdivisions);

		return (
			<>
				<EditorInspectorSectionField title="Ground">
					<EditorInspectorNumberField 
						object={this.props.object.metadata} 
						property="width" 
						label="Width" 
						step={0.1} 
						onChange={() => this._handleGroundPropertyChange("width")}
					/>
					<EditorInspectorNumberField 
						object={this.props.object.metadata} 
						property="height" 
						label="Height" 
						step={0.1} 
						onChange={() => this._handleGroundPropertyChange("height")}
					/>
					<EditorInspectorNumberField 
						object={this.props.object.metadata} 
						property="subdivisions" 
						label="Subdivisions" 
						step={1} 
						min={1} 
						onChange={() => this._handleGroundPropertyChange("subdivisions")}
					/>
				</EditorInspectorSectionField>

				<EditorInspectorSectionField title="Height Map">
					<EditorInspectorTextureField
						title="Height Map Texture"
						object={this.props.object.metadata}
						property="heightMapTexture"
						scene={this.props.object.getScene()}
						onChange={(texture) => this._handleHeightMapTextureChanged(texture)}
					/>

					{this.props.object.metadata.heightMapTexture && (
						<>
							<EditorInspectorNumberField 
								object={this.props.object.metadata} 
								property="minHeight" 
								label="Min Height" 
								step={0.1} 
								onChange={() => this._handleHeightMapPropertyChange("minHeight")} 
							/>
							<EditorInspectorNumberField 
								object={this.props.object.metadata} 
								property="maxHeight" 
								label="Max Height" 
								step={0.1} 
								onChange={() => this._handleHeightMapPropertyChange("maxHeight")} 
							/>
							<EditorInspectorSwitchField 
								object={this.props.object.metadata} 
								property="useHeightMap" 
								label="Use Height Map" 
								onChange={() => this._toggleHeightMap()} 
							/>
							<button
								onClick={() => this._forceRefreshHeightMap()}
								style={{
									marginTop: '8px',
									padding: '4px 8px',
									fontSize: '12px',
									backgroundColor: '#f0f0f0',
									border: '1px solid #ccc',
									borderRadius: '4px',
									cursor: 'pointer'
								}}
							>
								Force Refresh Height Map
							</button>
						</>
					)}
				</EditorInspectorSectionField>
			</>
		);
	}

	private async _handleGroundPropertyChange(property: string): Promise<void> {
		console.log(`Ground property changed: ${property} = ${this.props.object.metadata[property]}`);
		
		try {
			// For width, height, and subdivisions, we need to regenerate geometry
			// For minHeight and maxHeight, we only need to reapply the height map
			if (property === 'width' || property === 'height' || property === 'subdivisions') {
				// Use HeightMapUtils to handle the property change and update the mesh
				const success = await HeightMapUtils.handleGroundPropertyChange(
					this.props.object,
					this.props.object.metadata,
					property,
					this.props.object.metadata[property],
					MeshGeometryInspector._maxSubdivisions
				);

				if (success) {
					console.log(`Successfully updated ground mesh for property: ${property}`);
					// Notify the editor that the node has been modified
					onNodeModifiedObservable.notifyObservers(this.props.object);
					// Force update to reflect changes in the UI
					this.forceUpdate();
				} else {
					console.error(`Failed to update ground mesh for property: ${property}`);
				}
			}
			// Note: minHeight and maxHeight are handled by _handleHeightMapPropertyChange
		} catch (error) {
			console.error(`Error updating ground mesh for property: ${property}:`, error);
		}
	}

	private async _handleHeightMapPropertyChange(property: string): Promise<void> {
		console.log(`Height map property changed: ${property} = ${this.props.object.metadata[property]}`);
		
		try {
			// For height map properties like minHeight and maxHeight, we only need to reapply the height map
			// without regenerating geometry
			await this._reapplyHeightMapOnly();
			
			// Notify the editor that the node has been modified
			onNodeModifiedObservable.notifyObservers(this.props.object);
			
			// Force update to reflect changes in the UI immediately
			this.forceUpdate();
		} catch (error) {
			console.error(`Error updating height map property: ${property}:`, error);
			toast.error(`Failed to update height map property: ${error.message}`);
		}
	}

	private async _handleHeightMapTextureChanged(texture: Texture | CubeTexture | ColorGradingTexture | null): Promise<void> {
		try {
			console.log("Height map texture changed:", texture ? "assigned" : "removed");
			
			const result = HeightMapUtils.handleInspectorHeightMapTextureChanged(
				texture,
				this.props.object.metadata,
				MeshGeometryInspector._maxSubdivisions,
				() => this.forceUpdate()
			);
			
			// If texture was removed, revert to flat ground immediately
			if (!texture) {
				console.log("Texture removed, reverting to flat ground...");
				await this._revertToFlatGround();
			}
			// If texture was assigned, ensure height map is disabled initially
			else if (result.shouldApplyHeightMap === false) {
				console.log("Texture assigned, height map toggle starts disabled - user must enable manually");
				
				// Ensure the texture is properly stored and height map is disabled
				// The toggle will start in the off position
				
				// Force update to show the height map controls
				this.forceUpdate();
			}
			
			// Notify the editor that the node has been modified
			onNodeModifiedObservable.notifyObservers(this.props.object);
			
			// Log validation errors if any
			if (result.validationErrors && result.validationErrors.length > 0) {
				console.warn("Height map texture validation warnings:", result.validationErrors);
			}
		} catch (error) {
			console.error("Error handling height map texture change:", error);
			toast.error(`Failed to handle height map texture change: ${error.message}`);
		}
	}

	private async _toggleHeightMap(): Promise<void> {
		try {
			console.log(`Toggling height map to: ${this.props.object.metadata.useHeightMap}`);
			console.log("Current metadata:", this.props.object.metadata);
			
			const result = await HeightMapUtils.toggleInspectorHeightMap(
				this.props.object,
				this.props.object.metadata,
				this.props.object.metadata.useHeightMap,
				MeshGeometryInspector._maxSubdivisions,
				() => this.forceUpdate()
			);
			
			if (result.success) {
				// If height map is enabled, apply it immediately
				if (this.props.object.metadata.useHeightMap && this.props.object.metadata.heightMapTexture) {
					console.log("Height map enabled, applying now...");
					
					// Force reapplication by clearing any existing height map state
					await this._forceClearHeightMapState();
					
					// Small delay to ensure geometry is ready
					await new Promise(resolve => setTimeout(resolve, 10));
					
					await this._applyHeightMap();
					
					// Force update and small delay to ensure changes are applied
					this.forceUpdate();
					await new Promise(resolve => setTimeout(resolve, 10));
					
					// Verify the height map was applied
					const isApplied = HeightMapUtils.isHeightMapApplied(this.props.object, this.props.object.metadata);
					console.log("Height map application verified:", isApplied);
					
					// If verification fails, try one more time
					if (!isApplied) {
						console.log("Height map verification failed, retrying...");
						await this._applyHeightMap();
						
						// Force update and delay again
						this.forceUpdate();
						await new Promise(resolve => setTimeout(resolve, 10));
						
						const retryVerification = HeightMapUtils.isHeightMapApplied(this.props.object, this.props.object.metadata);
						console.log("Height map retry verification:", retryVerification);
					}
				} else if (this.props.object.metadata.useHeightMap && !this.props.object.metadata.heightMapTexture) {
					console.log("Height map enabled but no texture assigned, waiting for texture...");
				} else {
					console.log("Height map disabled, mesh should be flat but texture persists");
					// Don't clear the texture - it should persist for when user re-enables
				}
				
				// Notify the editor that the node has been modified
				onNodeModifiedObservable.notifyObservers(this.props.object);
				console.log("Height map toggled successfully");
			} else {
				console.error("Failed to toggle height map:", result.error);
				toast.error(`Failed to toggle height map: ${result.error}`);
			}
		} catch (error) {
			console.error("Error toggling height map:", error);
			toast.error(`Failed to toggle height map: ${error.message}`);
		}
	}

	private async _applyHeightMap(): Promise<void> {
		try {
			// Check if height map is already applied to avoid unnecessary work
			const isAlreadyApplied = HeightMapUtils.isHeightMapApplied(this.props.object, this.props.object.metadata);
			console.log("Height map already applied check:", isAlreadyApplied);
			
			// First, check if we need to regenerate geometry (for width/height/subdivisions changes)
			const config = HeightMapUtils.createValidatedConfig(
				this.props.object.metadata, 
				MeshGeometryInspector._maxSubdivisions
			);
			
			// Always regenerate geometry when applying height map to ensure clean state
			const wasRegenerated = HeightMapUtils.regenerateGroundGeometry(this.props.object, config);
			if (wasRegenerated) {
				console.log("Geometry was regenerated, applying height map...");
			} else {
				console.log("Geometry was not regenerated, but applying height map anyway...");
			}
			
			// Now apply the height map with the updated geometry
			const result = await HeightMapUtils.applyInspectorHeightMap(
				this.props.object,
				this.props.object.metadata,
				MeshGeometryInspector._maxSubdivisions,
				() => this.forceUpdate(),
				(error) => toast.error(`Failed to apply height map: ${error}`)
			);
			
			if (result.success || result.usedFallback) {
				// Notify the editor that the node has been modified
				onNodeModifiedObservable.notifyObservers(this.props.object);
				console.log("Height map applied successfully");
			}
		} catch (error) {
			console.error("Error applying height map:", error);
			toast.error(`Failed to apply height map: ${error.message}`);
		}
	}

	private async _reapplyHeightMapOnly(): Promise<void> {
		// For height map properties like minHeight/maxHeight, we only need to reapply the height map
		// without regenerating the entire geometry
		if (this.props.object.metadata.useHeightMap && this.props.object.metadata.heightMapTexture) {
			console.log("Reapplying height map with new height range...");
			
			try {
				// Use the optimized method that doesn't regenerate geometry
				const result = await HeightMapUtils.reapplyHeightMapOnly(
					this.props.object,
					this.props.object.metadata,
					MeshGeometryInspector._maxSubdivisions,
					() => this.forceUpdate(),
					(error) => toast.error(`Failed to reapply height map: ${error}`)
				);

				if (result.success || result.usedFallback) {
					// Notify the editor that the node has been modified
					onNodeModifiedObservable.notifyObservers(this.props.object);
					console.log("Height map reapplied successfully");
				} else {
					console.error("Failed to reapply height map:", result.error);
					toast.error(`Failed to reapply height map: ${result.error}`);
				}
			} catch (error) {
				console.error("Error reapplying height map:", error);
				toast.error(`Failed to reapply height map: ${error.message}`);
			}
		} else {
			console.log("Height map not enabled or no texture, skipping reapplication");
		}
	}

	private _getProxy<T>(onChange: () => void): T {
		return new Proxy(this.props.object.metadata, {
			get(target, prop) {
				return target[prop];
			},
			set(obj, prop, value) {
				obj[prop] = value;
				onChange();
				return true;
			},
		});
	}

	private async _forceRefreshHeightMap(): Promise<void> {
		try {
			console.log("Force refreshing height map...");
			
			if (this.props.object.metadata.useHeightMap && this.props.object.metadata.heightMapTexture) {
				// Force regenerate geometry and reapply height map
				const config = HeightMapUtils.createValidatedConfig(
					this.props.object.metadata, 
					MeshGeometryInspector._maxSubdivisions
				);
				
				HeightMapUtils.regenerateGroundGeometry(this.props.object, config);
				await this._applyHeightMap();
				
				// Notify the editor that the node has been modified
				onNodeModifiedObservable.notifyObservers(this.props.object);
				console.log("Height map force refreshed successfully");
			} else {
				console.log("Height map not enabled or no texture, skipping force refresh");
			}
		} catch (error) {
			console.error("Error force refreshing height map:", error);
			toast.error(`Failed to force refresh height map: ${error.message}`);
		}
	}

	private async _forceClearHeightMapState(): Promise<void> {
		try {
			console.log("Force clearing height map state...");
			
			// Force regenerate geometry to clear any existing height map data
			const config = HeightMapUtils.createValidatedConfig(
				this.props.object.metadata, 
				MeshGeometryInspector._maxSubdivisions
			);
			
			HeightMapUtils.regenerateGroundGeometry(this.props.object, config);
			console.log("Height map state cleared successfully");
		} catch (error) {
			console.error("Error clearing height map state:", error);
			toast.error(`Failed to clear height map state: ${error.message}`);
		}
	}

	private async _revertToFlatGround(): Promise<void> {
		try {
			console.log("Reverting to flat ground...");
			
			// Use the HeightMapUtils method to revert to flat ground
			await HeightMapUtils.toggleHeightMapWithStateManagement(
				this.props.object,
				this.props.object.metadata,
				false, // disable height map
				MeshGeometryInspector._maxSubdivisions
			);
			
			// Force update and notify editor
			this.forceUpdate();
			onNodeModifiedObservable.notifyObservers(this.props.object);
			
			console.log("Successfully reverted to flat ground");
		} catch (error) {
			console.error("Error reverting to flat ground:", error);
			toast.error(`Failed to revert to flat ground: ${error.message}`);
		}
	}
}
