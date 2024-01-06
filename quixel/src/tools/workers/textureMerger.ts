this.addEventListener("message", (ev) => {
    const callback = new Function(ev.data.callback)();
    const aPixels = ev.data.aPixels;
    const bPixels = ev.data.bPixels;
    
    const result: number[] = [];
    for (let i = 0; i < aPixels.length; i += 4) {
        const color = callback(
            { r: aPixels[i], g: aPixels[i + 1], b: aPixels[i + 2], a: aPixels[i + 3] },
            { r: bPixels[i], g: bPixels[i + 1], b: bPixels[i + 2], a: bPixels[i + 3] },
        );

        result.push.apply(result, [color.r, color.g, color.b, color.a]);
    }

    this.postMessage({
        id: ev.data.id,
        result,
    }, undefined!);
});

this.postMessage("initialized", undefined!);