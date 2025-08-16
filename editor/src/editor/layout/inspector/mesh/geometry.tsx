import sharp from "sharp";
import { dirname, join } from "path/posix";

import { Component, ReactNode } from "react";

import { CreateBoxVertexData, CreateSphereVertexData, CreateGroundVertexData, Mesh, CreateGroundFromHeightMapVertexData, Color3 } from "babylonjs";

import { isGroundMesh } from "../../../../tools/guards/nodes";
import { smoothGroundGeometry } from "../../../../tools/mesh/ground";

import { projectConfiguration } from "../../../../project/configuration";

import { BoxMeshGeometryInspector } from "./geometry/box";
import { GroundMeshGeometryInspector } from "./geometry/ground";
import { SphereMeshGeometryInspector } from "./geometry/sphere";

const objectsProxies = new Map<any, any>();

export interface IMeshGeometryInspectorProps {
	object: Mesh;
}

export class MeshGeometryInspector extends Component<IMeshGeometryInspectorProps> {
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

			this.props.object.refreshBoundingInfo({
				updatePositionsArray: true,
			});
		});

		return <BoxMeshGeometryInspector proxy={proxy} />;
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

			this.props.object.refreshBoundingInfo({
				updatePositionsArray: true,
			});
		});

		return <SphereMeshGeometryInspector proxy={proxy} />;
	}

	private _getGroundInspectorComponent(): ReactNode {
		// From v5.1.1
		this.props.object.metadata.minHeight ??= 0;
		this.props.object.metadata.maxHeight ??= 150;
		this.props.object.metadata.smoothFactor ??= 0;
		this.props.object.metadata.heightMapTexturePath ??= null;
		this.props.object.metadata.alphaFilter ??= 0;
		this.props.object.metadata.colorFilter ??= [0.3, 0.59, 0.11];

		const proxy = this._getProxy(() => {
			if (this.props.object.metadata.heightMapTexturePath) {
				this._updateGroundVertexDataFromHeightMap();
			} else {
				this._updateGroundVertexData();
			}

			this.props.object.refreshBoundingInfo({
				updatePositionsArray: true,
			});

			if (isGroundMesh(this.props.object)) {
				this.props.object.updateCoordinateHeights();
			}
		});

		return <GroundMeshGeometryInspector object={this.props.object} proxy={proxy} />;
	}

	private _heightMapTextureData = {
		width: 0,
		height: 0,
		buffer: null as Uint8Array | null,
		heightMapTexturePath: null as string | null,
		processing: false,
	};

	private _updateGroundVertexData(): void {
		this.props.object.geometry?.setAllVerticesData(
			CreateGroundVertexData({
				width: this.props.object.metadata.width,
				height: this.props.object.metadata.height,
				subdivisions: this.props.object.metadata.subdivisions >> 0,
			}),
			false
		);
	}

	private async _updateGroundVertexDataFromHeightMap(): Promise<void> {
		const subdivisions = this.props.object.metadata.subdivisions >> 0;

		if (!this._heightMapTextureData.buffer || this._heightMapTextureData.heightMapTexturePath !== this.props.object.metadata.heightMapTexturePath) {
			if (this._heightMapTextureData.processing) {
				return;
			}

			this._heightMapTextureData.processing = true;

			const textureAbsolutePath = join(dirname(projectConfiguration.path ?? ""), this.props.object.metadata.heightMapTexturePath);
			const sTexture = sharp(textureAbsolutePath);

			const [textureMetadata, textureBuffer] = await Promise.all([sTexture.metadata(), sTexture.raw().ensureAlpha(1).toBuffer()]);

			this._heightMapTextureData.buffer = textureBuffer;
			this._heightMapTextureData.width = textureMetadata.width;
			this._heightMapTextureData.height = textureMetadata.height;

			this._heightMapTextureData.processing = false;
		}

		if (subdivisions <= 1) {
			this.props.object.metadata.subdivisions = 32;
			this.forceUpdate();
		}

		const vertexData = CreateGroundFromHeightMapVertexData({
			width: this.props.object.metadata.width,
			height: this.props.object.metadata.height,
			subdivisions: this.props.object.metadata.subdivisions,
			alphaFilter: this.props.object.metadata.alphaFilter ?? 0,
			minHeight: this.props.object.metadata.minHeight ?? 0,
			maxHeight: this.props.object.metadata.maxHeight ?? 255,
			colorFilter: Color3.FromArray(this.props.object.metadata.colorFilter),
			bufferWidth: this._heightMapTextureData.width,
			bufferHeight: this._heightMapTextureData.height,
			buffer: this._heightMapTextureData.buffer,
		});

		// Smooth the terrain
		smoothGroundGeometry({
			ground: this.props.object,
			indices: vertexData.indices,
			normals: vertexData.normals,
			positions: vertexData.positions,
			subdivisions: this.props.object.metadata.subdivisions,
			smoothFactor: this.props.object.metadata.smoothFactor,
		});

		this.props.object.geometry?.setAllVerticesData(vertexData, false);
	}

	private _getProxy<T>(onChange: () => void): T {
		const existingProxy = objectsProxies.get(this.props.object.metadata);
		if (existingProxy) {
			return existingProxy;
		}

		const proxy = new Proxy(this.props.object.metadata, {
			get(target, prop) {
				return target[prop];
			},
			set(obj, prop, value) {
				obj[prop] = value;
				onChange();
				return true;
			},
		});

		objectsProxies.set(this.props.object.metadata, proxy);

		return proxy;
	}
}
