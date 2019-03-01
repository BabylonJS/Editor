var vscode = acquireVsCodeApi();
var data = null;
var last = '';
var selectedNode = null;
var gui = null;
var sceneInfos = { };
var selectedObject = { };

/**
 * Create layout
 */
var layout = $('#mainLayout').w2layout({
    name: 'mainLayout',
    panels: [
        { type: 'main', resizable: true, content: '<canvas id="renderCanvas" class="graphcanvas ctxmenu" style="width: 100%; height: 100%;"></canvas>' },
        { type: 'right', resizable: true, size: 400, content: '<div id="editLayout" style="width: 100%; height: 100%;"></div>' }
    ]
});

var editLayout = $('#editLayout').w2layout({
    name: 'editLayout',
    panels: [
        { type: 'top', resizable: true, size: '50%', content: '<div id="nodes" style="width: 100%; height: 100%;"></div>' },
        { type: 'bottom', resizable: true, size: '50%', content: '<div id="edition" style="width: 100%; height: 100%;"></div>' }
    ]
});

var sidebar = $('#nodes').w2sidebar({
    name: 'nodes',
    img: null,
    nodes: []
});

/**
 * Initialize nodes
 */
EditorExtensions.GraphExtension.ClearNodes();
EditorExtensions.GraphExtension.RegisterNodes();

/**
 * Initialize graph
 */
var graphData = new EditorExtensions.LGraph();
graphData.onNodeAdded = function (node) {
    node.shape = 'round';
};

/**
 * Initialize graph canvas
 */
EditorExtensions.LGraphCanvas.prototype.processContextMenu = function (node, ev) {
    selectedNode = node;

    if (node) {
        $(event.target).contextMenu({ x: ev.offsetX, y: ev.offsetY });
    }
};

var graph = new EditorExtensions.LGraphCanvas('#renderCanvas', graphData);
graph.canvas.addEventListener('contextmenu', function (ev) { ev.stopPropagation(); ev.preventDefault(); });
graph.render_canvas_area = false;

/**
 * Edition
 */
var getPropertiesPaths = function (node, path, root, rootProperties) {
    if (!path) path = '';

    var result = rootProperties || ['Scene'];
    var object = root || node.graph.scriptObject;

    for (var k in object) {
        var key = path === '' ? k : path + '.' + k;

        // Bypass _
        if (k[0] === '_') {
            continue;
        }

        // Excluded
        if (k === 'localMatrix')
            continue;

        // Constructor name
        var ctor = object[k].constructor.name.toLowerCase();
        var lowercase = k.toLowerCase();

        switch (ctor) {
            case 'boolean':
            case 'string':
            case 'number':
                result.push(key);
                break;
            
            case 'array':
                switch (object[k].length) {
                    case 2:
                        result.push(key + '.x');
                        result.push(key + '.y');
                        break;
                    case 3:
                        var exts = (lowercase.indexOf('color') === -1) ? ['.x', '.y', '.z'] : ['.r', '.g', '.b'];
                        result.push(key + exts[0]);
                        result.push(key + exts[1]);
                        result.push(key + exts[2]);
                        break;
                    case 4:
                        var exts = (lowercase.indexOf('color') === -1) ? ['.x', '.y', '.z', '.w'] : ['.r', '.g', '.b', '.a'];
                        result.push(key + exts[0]);
                        result.push(key + exts[1]);
                        result.push(key + exts[2]);
                        result.push(key + exts[3]);
                        break;
                }
                break;

            case 'object':
                getPropertiesPaths(node, key, object[k], result);
                break;

            default: break;
        }
    }

    // Sort
    return result;
};

var getNodeByName = function (name) {
    var m = sceneInfos.meshes.find(m => m.name === name);
    if (m) { return m; }

    var l = sceneInfos.lights.find(l => l.name === name);
    if (l) { return l; }

    var c = sceneInfos.cameras.find(c => c.name === name);
    if (c) { return c; }

    var ps = sceneInfos.particleSystems.find(ps => ps.name === name);
    if (ps) { return ps; }

    return null;
}

graph.onNodeSelected = function (node) {
    selectedNode = node;

    // Remove?
    if (gui) {
        gui.destroy();
        gui.domElement.parentNode.removeChild(gui.domElement);
    }

    // Create
    gui = new dat.GUI({
        autoPlace: false,
        scrollable: true
    });

    $('#edition')[0].appendChild(gui.domElement);
    gui.width = layout.get('right').width;

    // Common
    var temp = {
        _mode: node.mode
    };

    var common = gui.addFolder('Common');
    common.open();
    common.add(node, 'title').name('Title');

    var modes = ['ALWAYS', 'ON_EVENT', 'NEVER', 'ON_TRIGGER'];
    temp._mode = modes[node.mode];
    common.add(temp, '_mode', modes).name('Mode').onChange(function (r) {
        node.mode = EditorExtensions.LiteGraph[r];
        EditorExtensions.LiteGraphNode.SetColor(node);
    });

    // Properties
    if (Object.keys(node.properties).length === 0) {
        gui.addFolder('No properties');
        return;
    }

    var properties = gui.addFolder('Properties');
    properties.open();

    var keys = Object.keys(node.properties);
    keys.forEach(function (k) {
        // Node path?
        if (k === 'nodePath') {
            var result = ['self'];
            sceneInfos.meshes.forEach(function (m) { result.push(m.name); });
            sceneInfos.lights.forEach(function (l) { result.push(l.name); });
            sceneInfos.cameras.forEach(function (c) { result.push(c.name); });
            sceneInfos.particleSystems.forEach(function (ps) { result.push(ps.name); });

            // Sort

            return properties.add(node.properties, k, result).name('Target Node').onChange(function () { graph.onNodeSelected(node); });
        }

        // Property path?
        if (k === 'propertyPath') {
            if (node.hasProperty('nodePath')) {
                var path = node.properties['nodePath'];

                if (path === 'self')
                    return properties.add(node.properties, k, getPropertiesPaths(node, '', selectedObject)).name(k);

                var target = (path === 'Scene') ? sceneInfos : getNodeByName(path);
                return properties.add(node.properties, k, getPropertiesPaths(node, '', target)).name(k);
            }
            
            return properties.add(node.properties, k, getPropertiesPaths(node)).name(k);
        }

        // Swith type of property
        switch (typeof node.properties[k]) {
            case 'number': properties.add(node.properties, k).step(0.001).name(k); break;
            case 'string': properties.add(node.properties, k).name(k); break;
            case 'boolean': properties.add(node.properties, k).name(k); break;
            default: break;
        }
    });
};

/**
 * Callbacks
 */
var refresh = function () {
    if (!data) {
        return;
    }
    data.graph = graphData.serialize();

    var str = JSON.stringify(data.graph);
    if (str === last) {
        return;
    }

    last = str;
    vscode.postMessage({ command: 'set-graph', graph: data });
};

var resize = function () {
    var previewPanel = layout.get('main');
    graph.resize(previewPanel.width, previewPanel.height);
}

/**
 * Events
 */
window.addEventListener('resize', function () { resize(); });
document.body.addEventListener('mousemove', function () { refresh(); });
layout.on({ execute: 'after', type: 'resize' }, function () { resize(); });

/**
 * Context menu
 */
$.contextMenu({
    selector: '.ctxmenu',
    trigger: 'none',
    build: function ($trigger, e) {
        e.preventDefault();
        return {
            callback: function (key) {
                switch (key) {
                    case 'clone':
                        var clone = EditorExtensions.LiteGraph.createNode(selectedNode.type);
                        clone.pos = [selectedNode.pos[0] + 20, selectedNode.pos[1] + 20];
                        Object.assign(clone.properties, selectedNode.properties);
                        Object.assign(clone.outputs, selectedNode.outputs);
                        graphData.add(clone);
                        break;
                    case 'remove':
                        graphData.remove(selectedNode);
                        selectedNode = null;
                        break;
                    default: break;
                }
            },
            items: {
                'clone': { name: 'Clone', icon: 'fa-edit' },
                'remove': { name: 'Remove', icon: 'fa-remove' },
            }
        }
    }
});

/**
 * VSCode events
 */
window.addEventListener('message', function (e) {
    const m = e.data;

    switch (m.command) {
        case 'set-graph':
            var scale = graph.scale;
            var offset = graph.offset.slice();

            data = m.graph;
            graphData.configure(data.graph);

            // Reset state
            graph.offset = offset;
            graph.scale = scale;

            graph.dirty_canvas = true;
            graph.dirty_bgcanvas = true;
            break;
        case 'set-scene-infos':
            sceneInfos = m.infos;
            if (selectedNode) {
                graph.onNodeSelected(selectedNode);
            }
            break;
        case 'set-selected-object':
            selectedObject = m.object;
            if (selectedNode) {
                graph.onNodeSelected(selectedNode);
            }
            break;
    }
});

/**
 * Fill sidebar
 */
const keys = Object.keys(EditorExtensions.LiteGraph.registered_node_types);
keys.forEach(function (k) {
    var folders = {};
    var split = k.split('/');
    var id = split[0];
    var name = split[1];

    // Create folder?
    if (!folders[id]) {
        folders[id] = true;
        sidebar.add({ id: id, text: id, group: true });
    }

    // Add
    sidebar.add(id, { id: k, text: name, img: 'icon-page' });

    // Event
    sidebar.on('dblClick', function (ev) {
        if (ev.object.id === k) {
            var node = EditorExtensions.LiteGraph.createNode(k);
            if (!node)
                return;

            if (node.size[0] < 100)
                node.size[0] = 100;

            var previewPanel = layout.get('main');
            node.pos = [previewPanel.width / 2 - node.size[0] / 2, previewPanel.height / 2 - node.size[1] / 2];
            graphData.add(node);
        }
    });
});

/**
 * Require graph
 */
vscode.postMessage({ command: 'require-graph' });

/**
 * Finish
 */
resize();
