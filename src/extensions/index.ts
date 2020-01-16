import Extensions from './extensions';
import Extension from './extension';
import Tools from './tools/tools';

import AssetsExtension from './assets/assets';
import CodeExtension from './behavior-code/code';
import GraphExtension from './behavior-graph/graph';
import PathFinderExtension from './path-finder/index';
import PostProcessEditorExtension from './post-process-editor/post-process-editor';
import MaterialEditorExtension from './material-editor/material-editor';
import PostProcessExtension from './post-process/post-processes';
import CustomMetadatasExtension from './metadata/metadatas';
import LODExtension from './lod/index';

import { IExtension, ExtensionConstructor } from './typings/extension';

export {
    Extensions,
    Extension,
    Tools,

    AssetsExtension,
    CodeExtension,
    GraphExtension,
    PostProcessExtension,
    MaterialEditorExtension,
    PathFinderExtension,
    PostProcessEditorExtension,
    CustomMetadatasExtension,
    LODExtension,

    IExtension, ExtensionConstructor
}

// Polyfills
import { defineRequire } from './tools/require';
defineRequire();
