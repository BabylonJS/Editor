import Extensions from './extensions';
import Extension from './extension';

import AssetsExtension from './assets/assets';
import CodeExtension from './behavior/code';
import GraphExtension from './behavior/graph';
import PathFinderExtension from './path-finder/index';
import PostProcessEditorExtension from './post-process-editor/post-process-editor';
import MaterialEditorExtension from './material-editor/material-editor';
import PostProcessExtension from './post-process/post-processes';
import CustomMetadatasExtension from './metadata/metadatas';

import { IExtension, ExtensionConstructor } from './typings/extension';

export {
    Extensions,
    Extension,

    AssetsExtension,
    CodeExtension,
    GraphExtension,
    PostProcessExtension,
    MaterialEditorExtension,
    PathFinderExtension,
    PostProcessEditorExtension,
    CustomMetadatasExtension,

    IExtension, ExtensionConstructor
}

// Polyfills
import { defineRequire } from './tools/require';
defineRequire();
