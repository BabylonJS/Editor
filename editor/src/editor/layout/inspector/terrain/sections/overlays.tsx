import { useEffect } from "react";

import { IconType } from "react-icons";
import { LuAudioWaveform, LuGrid3X3, LuLayers, LuTarget, LuTrendingUp } from "react-icons/lu";

import { Mesh } from "babylonjs";

import { Toggle } from "../../../../../ui/shadcn/ui/toggle";

import { ITerrainInfo } from "../../../../../tools/terrain/engine/types";
import { TerrainOverlay } from "../../../../../tools/terrain/core/types";
import { setTerrainOverlay } from "../../../../../tools/terrain/engine/info";

import { useTerrainSettings } from "../hooks";
import { getActiveTerrainLayerId, terrainSettings, updateTerrainSettings } from "../settings";

import { TerrainSettingsNumberField } from "../components/settings-fields";

const overlays: { overlay: TerrainOverlay; label: string; icon: IconType }[] = [
	{ overlay: "layer-weights", label: "Layer weights", icon: LuLayers },
	{ overlay: "active-layer", label: "Active layer", icon: LuTarget },
	{ overlay: "contours", label: "Contours", icon: LuAudioWaveform },
	{ overlay: "slope", label: "Slope", icon: LuTrendingUp },
	{ overlay: "grid", label: "Vertex grid", icon: LuGrid3X3 },
];

export interface ITerrainOverlaysProps {
	mesh: Mesh;
	info: ITerrainInfo;
}

/**
 * Overlays drawn on the terrain while the tool is opened, for the line of the header: the toggles of the weights of the layers, the
 * active layer, the contour lines, the slope and the grid of vertices, then the name of the selected overlay, which takes the space left
 * on the line. The overlays are drawn by the terrain material, so the toggles are disabled for a terrain that keeps its own material.
 */
export function TerrainOverlays(props: ITerrainOverlaysProps) {
	useTerrainSettings();

	const view = terrainSettings.view;
	const hasTerrainMaterial = !!props.info.material?.isTerrainMaterial;
	const activeLayerId = getActiveTerrainLayerId(props.mesh.material);
	const layers = props.info.layers.map((layer) => layer.id).join();

	useEffect(() => {
		setTerrainOverlay(props.mesh, view.overlay, {
			activeLayerId,
			opacity: view.overlayOpacity,
			contourInterval: view.contourInterval,
		});
	}, [props.mesh, props.mesh.material, props.info.subdivisions, layers, activeLayerId, view.overlay, view.overlayOpacity, view.contourInterval]);

	useEffect(() => {
		return () => {
			if (!props.mesh.isDisposed()) {
				setTerrainOverlay(props.mesh, "none");
			}
		};
	}, [props.mesh]);

	const currentMode = overlays.find((item) => item.overlay === view.overlay)?.label ?? "";

	return (
		<>
			<div className="flex items-center gap-1">
				{overlays
					.filter((item) => item.overlay !== "active-layer" || terrainSettings.category === "paint" || view.overlay === "active-layer")
					.map((item) => (
						<Toggle
							key={item.overlay}
							size="sm"
							aria-label={item.label}
							title={hasTerrainMaterial ? item.label : "Overlays are drawn by the terrain material: this terrain keeps its own material."}
							disabled={!hasTerrainMaterial}
							pressed={view.overlay === item.overlay}
							onPressedChange={(pressed) => updateTerrainSettings((settings) => (settings.view.overlay = pressed ? item.overlay : "none"))}
						>
							<item.icon />
						</Toggle>
					))}
			</div>

			<div className="flex-1 min-w-0 truncate">{currentMode}</div>
		</>
	);
}

export interface ITerrainOverlayOptionsProps {
	info: ITerrainInfo;
}

/**
 * Options of the selected overlay, shown under the line of the header: its opacity and the interval of the contour lines.
 */
export function TerrainOverlayOptions(props: ITerrainOverlayOptionsProps) {
	useTerrainSettings();

	const view = terrainSettings.view;

	if (!props.info.material?.isTerrainMaterial || view.overlay === "none") {
		return null;
	}

	return (
		<>
			<TerrainSettingsNumberField object={view} property="overlayOpacity" label="Opacity" percent min={0} max={100} step={1} />
			{view.overlay === "contours" && <TerrainSettingsNumberField object={view} property="contourInterval" label="Interval" min={1} step={1} />}
		</>
	);
}
