const dts = require("dts-bundle");

console.log(`
-------------------------------------------------------------
DTS
-------------------------------------------------------------
`);

dts.bundle({
    name: "babylonjs-editor",
    main: "./declaration/src/index.d.ts",
    out: "../../module/index.d.ts",
});

console.log("DTS available at ./module/index.d.ts");
