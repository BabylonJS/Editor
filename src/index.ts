// Plugins
export { IPluginToolbar } from "./renderer/editor/plugins/toolbar";
export { IPlugin } from "./renderer/editor/plugins/plugin";

export { AbstractEditorPlugin, IEditorPluginProps } from "./renderer/editor/tools/plugin";

// Editor
export { Editor } from "./renderer/editor/editor";

// Tools
export { Tools } from "./renderer/editor/tools/tools";
export { IPCTools } from "./renderer/editor/tools/ipc";

// Assets
export { Assets, IAssetComponent, IAssetsProps, IAssetsState } from "./renderer/editor/components/assets";
export { AbstractAssets, IAbstractAssets, IAssetComponentItem, IAssetsComponentProps, IAssetsComponentState } from "./renderer/editor/assets/abstract-assets";

export { MeshesAssets } from "./renderer/editor/assets/meshes";
export { MaterialAssets } from "./renderer/editor/assets/materials";
export { TextureAssets } from "./renderer/editor/assets/textures";
export { SoundAssets } from "./renderer/editor/assets/sounds";
export { PrefabAssets } from "./renderer/editor/assets/prefabs";
export { GraphAssets } from "./renderer/editor/assets/graphs";

// Inspectors
export { Inspector, IInspectorProps, IInspectorState, IObjectInspector, IObjectInspectorProps } from "./renderer/editor/components/inspector";
export { AbstractInspectorLegacy } from "./renderer/editor/inspectors/abstract-inspector-legacy";
export { AbstractInspector } from "./renderer/editor/inspectors/abstract-inspector";
export { MaterialInspector } from "./renderer/editor/inspectors/materials/material-inspector";

export { InspectorColor } from "./renderer/editor/gui/inspector/color";
export { InspectorButton } from "./renderer/editor/gui/inspector/button";
export { InspectorNumber } from "./renderer/editor/gui/inspector/number";
export { InspectorString } from "./renderer/editor/gui/inspector/string";
export { InspectorBoolean } from "./renderer/editor/gui/inspector/boolean";
export { InspectorSection } from "./renderer/editor/gui/inspector/section";
export { InspectorVector2 } from "./renderer/editor/gui/inspector/vector2";
export { InspectorVector3 } from "./renderer/editor/gui/inspector/vector3";
export { InspectorNotifier } from "./renderer/editor/gui/inspector/notifier";
export { InspectorColorPicker } from "./renderer/editor/gui/inspector/color-picker";
export { InspectorList, IInspectorListItem } from "./renderer/editor/gui/inspector/list";

// Project
export { FilesStore, IContentFile, IFile } from "./renderer/editor/project/files";
export { IBabylonFile, IBabylonFileNode, IProject, IWorkSpace } from "./renderer/editor/project/typings";
export { ProjectExporter } from "./renderer/editor/project/project-exporter";
export { Project } from "./renderer/editor/project/project";
export { WorkSpace } from "./renderer/editor/project/workspace";

// GUI
export { Alert, IAlertProps } from "./renderer/editor/gui/alert";
export { Dialog, IDialogProps } from "./renderer/editor/gui/dialog";
export { Confirm, IConfirmProps } from "./renderer/editor/gui/confirm";

import "./renderer/editor/gui/augmentations/index";