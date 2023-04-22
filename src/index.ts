import { Editor } from "./renderer/editor/editor";

// Plugins
export { IPluginAssets } from "./renderer/editor/plugins/assets";
export { IPluginToolbar } from "./renderer/editor/plugins/toolbar";
export { IPluginGraph, IPluginGraphNode } from "./renderer/editor/plugins/graph";
export { IPlugin, IPluginConfiguration } from "./renderer/editor/plugins/plugin";

export { AbstractEditorPlugin, IEditorPluginProps } from "./renderer/editor/tools/plugin";

// Editor
export { Editor } from "./renderer/editor/editor";

// Tools
export { Tools } from "./renderer/editor/tools/tools";
export { IPCTools } from "./renderer/editor/tools/ipc";
export { FSTools } from "./renderer/editor/tools/fs";

// Assets
export { Assets, IAssetComponent, IAssetsProps, IAssetsState } from "./renderer/editor/components/assets";
export { AbstractAssets, IAbstractAssets, IAssetComponentItem, IAssetsComponentProps, IAssetsComponentState } from "./renderer/editor/assets/abstract-assets";

export { AssetsBrowserMoveHandler } from "./renderer/editor/components/assets-browser/files/move/move-handler";
export { AssetsBrowserItemHandler, IAssetsBrowserItemHandlerProps, IAssetsBrowserItemHandlerState, IItemHandler } from "./renderer/editor/components/assets-browser/files/item-handler";

export { MaterialAssets } from "./renderer/editor/assets/materials";
export { TextureAssets } from "./renderer/editor/assets/textures";

// Inspectors
export { Inspector, IInspectorProps, IInspectorState, IObjectInspector, IObjectInspectorProps } from "./renderer/editor/components/inspector";
export { AbstractInspector } from "./renderer/editor/components/inspectors/abstract-inspector";
export { MaterialInspector, IMaterialInspectorState } from "./renderer/editor/components/inspectors/materials/material-inspector";

export { InspectorColor } from "./renderer/editor/gui/inspector/fields/color";
export { InspectorButton } from "./renderer/editor/gui/inspector/fields/button";
export { InspectorNumber } from "./renderer/editor/gui/inspector/fields/number";
export { InspectorString } from "./renderer/editor/gui/inspector/fields/string";
export { InspectorBoolean } from "./renderer/editor/gui/inspector/fields/boolean";
export { InspectorSection } from "./renderer/editor/gui/inspector/fields/section";
export { InspectorVector2 } from "./renderer/editor/gui/inspector/fields/vector2";
export { InspectorVector3 } from "./renderer/editor/gui/inspector/fields/vector3";
export { InspectorNotifier } from "./renderer/editor/gui/inspector/notifier";
export { InspectorColorPicker } from "./renderer/editor/gui/inspector/fields/color-picker";
export { InspectorList, IInspectorListItem } from "./renderer/editor/gui/inspector/fields/list";

// Graph
export { GraphNode, CodeGenerationExecutionType, CodeGenerationOutputType, ELinkErrorType, ICodeGenerationOutput, INodeContextMenuOption } from "./renderer/editor/graph/node";

// Project
export { FilesStore, IContentFile, IFile } from "./renderer/editor/project/files";
export { IBabylonFile, IBabylonFileNode, IProject, IWorkSpace } from "./renderer/editor/project/typings";
export { ProjectExporter } from "./renderer/editor/project/project-exporter";
export { Project } from "./renderer/editor/project/project";
export { WorkSpace } from "./renderer/editor/project/workspace";
export { SceneExporter } from "./renderer/editor/project/scene-exporter";

// Exporter
export { MeshExporter } from "./renderer/editor/export/mesh";
export { GeometryExporter } from "./renderer/editor/export/geometry";

// GUI
export { Alert, IAlertProps } from "./renderer/editor/gui/alert";
export { Dialog, IDialogProps } from "./renderer/editor/gui/dialog";
export { Confirm, IConfirmProps } from "./renderer/editor/gui/confirm";
export { Icon } from "./renderer/editor/gui/icon";

// Tools
export { SceneImporterTools, ISceneImporterToolsConfiguration } from "./renderer/editor/scene/import-tools";

// Packer
export { Packer, IPackerOptions, PackerStatus } from "./renderer/editor/project/packer/packer";

export let editor: Editor | null = null;
