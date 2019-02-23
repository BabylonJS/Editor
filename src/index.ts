import Editor from './editor/editor';

import Tools from './editor/tools/tools';
import Request from './editor/tools/request';
import UndoRedo from './editor/tools/undo-redo';
import ThemeSwitcher, { ThemeType } from './editor/tools/theme';

import Layout from './editor/gui/layout';
import Toolbar from './editor/gui/toolbar';
import List from './editor/gui/list';
import Grid, { GridRow } from './editor/gui/grid';
import Picker from './editor/gui/picker';
import Graph, { GraphNode } from './editor/gui/graph';
import Window from './editor/gui/window';
import CodeEditor from './editor/gui/code';
import Form from './editor/gui/form';
import Edition from './editor/gui/edition';
import Tree, { ContextMenuItem, TreeNode } from './editor/gui/tree';
import Dialog from './editor/gui/dialog';
import ContextMenu, { ContextMenuOptions } from './editor/gui/context-menu';
import ResizableLayout, { ComponentConfig, ItemConfigType } from './editor/gui/resizable-layout';

import AbstractEditionTool from './editor/edition-tools/edition-tool';

import { IStringDictionary, IDisposable, INumberDictionary } from './editor/typings/typings';
import { EditorPlugin } from './editor/typings/plugin';

import { ProjectRoot } from './editor/typings/project';
import CodeProjectEditorFactory from './editor/project/project-code-editor';

import SceneManager from './editor/scene/scene-manager';
import SceneFactory from './editor/scene/scene-factory';
import ScenePreview from './editor/scene/scene-preview';

import PrefabAssetComponent from './editor/prefabs/asset-component';
import { Prefab, PrefabNodeType } from './editor/prefabs/prefab';

export default Editor;
export {
    Editor,
    
    Tools,
    Request,
    UndoRedo,
    ThemeSwitcher, ThemeType,

    IStringDictionary,
    INumberDictionary,
    IDisposable,
    
    EditorPlugin,

    Layout,
    Toolbar,
    List,
    Grid, GridRow,
    Picker,
    Graph, GraphNode,
    Window,
    CodeEditor,
    Form,
    Edition,
    Tree, ContextMenuItem, TreeNode,
    Dialog,
    ContextMenu, ContextMenuOptions,
    ResizableLayout, ComponentConfig, ItemConfigType,

    AbstractEditionTool,

    ProjectRoot,
    CodeProjectEditorFactory,

    SceneManager,
    SceneFactory,
    ScenePreview,

    PrefabAssetComponent,
    Prefab, PrefabNodeType
}
