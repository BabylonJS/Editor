const rimraf = require("rimraf");
const os = require("os");
const path = require("path");

const testsDirectory = path.join(os.tmpdir(), "babylonjs-editor-test");

rimraf.sync(testsDirectory);
