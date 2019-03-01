var vscode = acquireVsCodeApi();
var data = null;
var last = '';
var selectedNode = null;

/**
 * Create layout
 */
var layout = $('#mainLayout').w2layout({
    name: 'mainLayout',
    panels: [
        { type: 'main', resizable: true, content: '<canvas id="renderCanvas" class="graphcanvas ctxmenu" style="width: 100%; height: 100%;"></canvas>' },
        { type: 'right', resizable: true, size: 400, content: '<div id="nodes" style="width: 100%; height: 100%;"></div>' }
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
graphData.onNodeAdded = (node) => {
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
window.addEventListener('message', e => {
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
