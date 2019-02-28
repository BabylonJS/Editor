var capturer = new CCapture({ format: 'webm', framerate: 60, display: true });
var vscode = acquireVsCodeApi();

/**
 * Returns the extension of the file
 */
var getFileExtension = function (filename) {
    var index = filename.lastIndexOf('.');
    if (index < 0)
        return filename;
    return filename.substring(index + 1);
}

/**
 * Returns the file type according to the given extension
 */
var getFileType = function (extension) {
    switch (extension) {
        case 'png': return 'image/png';
        case 'jpg': case 'jpeg': return 'image/jpeg';
        case 'bmp': return 'image/bmp';
        case 'tga': return 'image/targa';
        case 'dds': return 'image/vnd.ms-dds';
        case 'wav': case 'wave': return 'audio/wav';
        //case 'audio/x-wav';
        case 'mp3': return 'audio/mpeg';
        case 'mpg': case 'mpeg': return 'audio/mpeg';
        //case 'audio/mpeg3';
        //case 'audio/x-mpeg-3';
        case 'ogg': return 'audio/ogg';
        default: return '';
    }
}

/**
 * Creates a file from the given buffer and filename
 */
var createFile = function (buffer, filename) {
    var options = { type: getFileType(getFileExtension(filename)), lastModified: new Date(Date.now()) };

    var file = new Blob([buffer], options);
    file['name'] = BABYLON.Tools.GetFilename(filename);

    return file;
}

/**
 * Loads the scene
 */
var loadScene = function (sceneFile) {
    var engine = new BABYLON.Engine(document.getElementById('renderCanvas'));
    window.addEventListener("resize", function () {
        engine.resize();
    });

    // Import scene
    BABYLON.SceneLoader.Load('file:', sceneFile.name, engine, function (scene) {
        effectiveScene = scene;
        
        // Apply
        var readProject = function (project) {
            BABYLON.Tools.ReadFile(project, function (data) {
                vscode.postMessage({ command: 'notify', text: 'Applying extensions.' });
                EditorExtensions.Extensions.RoolUrl = 'file:';
                EditorExtensions.Extensions.ApplyExtensions(scene, JSON.parse(data).customMetadatas);

                runScene(engine, scene);
            });
        };

        var project = getFileByExtension(BABYLON.FilesInputStore.FilesToLoad, 'editorproject');
        if (project) {
            readProject(project);
        } else {
            runScene(engine, scene);
        }
    });
};

/**
 * Apply the render loop
 */
var runScene = function (engine, scene) {
    scene.executeWhenReady(function () {
        scene.activeCamera.attachControl(engine.getRenderingCanvas());
        engine.runRenderLoop(function () {
            scene.render();
        });
    });
}

/**
 * Returns the scene file
 */
var getFileByExtension = function (files, extension) {
    for (var thing in BABYLON.FilesInputStore.FilesToLoad) {
        var file = BABYLON.FilesInputStore.FilesToLoad[thing];
        if (getFileExtension(file.name) === extension) {
            return file;
        }
    }
};

/**
 * Run sockets
 */
vscode.postMessage({ command: 'notify', text: 'Connecting to Babylon.JS Editor...' });

var socket = io('http://' + window.userIp + ':1337/client');
socket.on('request-scene', (files) => {
    vscode.postMessage({ command: 'notify', text: 'Connected to Babylon.JS Editor.' });

    // Import Editor tools
    for (var thing in files) {
        var file = createFile(files[thing], thing);
        BABYLON.FilesInputStore.FilesToLoad[thing] = file;
    }

    // Get scene file
    var sceneFile = getFileByExtension(files, 'babylon');
    if (!sceneFile) {
        return vscode.postMessage({ command: 'notifyError', text: 'Cannont find any .babylon scene' })
    }

    loadScene(sceneFile);
});

var refresh = function () {
    vscode.postMessage({ command: 'refresh' });
};