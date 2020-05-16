const dts = require("dts-bundle");

dts.bundle({
    name: "babylonjs-editor",
    main: "./declaration/src/src/renderer/editor/index.d.ts",
    out: "../../../../../module/index.d.ts",
});
