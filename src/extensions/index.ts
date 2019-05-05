import Extensions from './extensions';
import Extension from './extension';

import AssetsExtension from './assets/assets';
import CodeExtension from './behavior/code';
import GraphExtension, { LGraph, LGraphCanvas, LiteGraph, LiteGraphNode, LGraphGroup } from './behavior/graph';
import PathFinderExtension from './path-finder/index';
import ParticlesCreatorExtension from './particles-creator/particles-creator';
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
    GraphExtension, LGraph, LGraphCanvas, LiteGraph, LiteGraphNode, LGraphGroup,
    PostProcessExtension,
    MaterialEditorExtension,
    PathFinderExtension,
    PostProcessEditorExtension,
    ParticlesCreatorExtension,
    CustomMetadatasExtension,

    IExtension, ExtensionConstructor
}

// Polyfills
import { defineRequire } from './tools/require';
defineRequire();
