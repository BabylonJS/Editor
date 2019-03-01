var vscode = acquireVsCodeApi();
var data = null;
var last = '';

/**
 * Initialize graph
 */
var graphData = new LGraph();
graphData.onNodeAdded = (node) => {
    node.shape = 'round';
};

/**
 * Initialize graph canvas
 */
var graph = new LGraphCanvas('#renderCanvas', graphData);
graph.render_canvas_area = false;
graph.resize(innerWidth, innerHeight);

/**
 * Callbacks
 */
var refresh = function () {
    data.graph = graphData.serialize();

    var str = JSON.stringify(data.graph);
    if (str === last) {
        return;
    }

    last = str;
    vscode.postMessage({ command: 'set-graph', graph: data });
};

/**
 * Events
 */
window.addEventListener('resize', function () { graph.resize(innerWidth, innerHeight); });
document.body.addEventListener('mousemove', function () { refresh(); });

/**
 * VSCode events
 */
window.addEventListener('message', e => {
    const m = e.data;

    switch (m.command) {
        case 'set-graph':
            data = m.graph;
            console.log(JSON.stringify(data.graph));
            graphData.configure(data.graph);
            break;
    }
});
