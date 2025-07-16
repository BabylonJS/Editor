import { NullEngine, Scene, ArcRotateCamera, Vector3 } from "babylonjs";

import { Editor } from "../../../src/editor/main";

import {
    createSSAO2RenderingPipeline, getSSAO2RenderingPipeline, disposeSSAO2RenderingPipeline,
    serializeSSAO2RenderingPipeline, parseSSAO2RenderingPipeline,
} from "../../../src/editor/rendering/ssao";

describe("editor/rendering/ssao", () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const camera = new ArcRotateCamera("camera", 0, 0, 0, Vector3.Zero(), scene);

    const editor = {
        layout: {
            preview: {
                scene,
                engine,
                camera,
            },
        },
    } as unknown as Editor;

    afterEach(() => {
        disposeSSAO2RenderingPipeline();
    });

    describe("createSSAO2RenderingPipeline", () => {
        test("should create a new rendering pipeline and return its reference", () => {
            const ssao = createSSAO2RenderingPipeline(editor);
            expect(ssao.getClassName()).toBe("SSAO2RenderingPipeline");
        });
    });

    describe("disposeSSAO2RenderingPipeline", () => {
        test("should dispose of the SSAO2 rendering pipeline", () => {
            const ssao = createSSAO2RenderingPipeline(editor);
            jest.spyOn(ssao, "dispose");

            disposeSSAO2RenderingPipeline();
            expect(ssao.dispose).toHaveBeenCalled();
            expect(getSSAO2RenderingPipeline()).toBeNull();
        });
    });

    describe("getSSAO2RenderingPipeline", () => {
        test("should return the reference to the currently available SSAO2 rendering pipeline", () => {
            expect(getSSAO2RenderingPipeline()).toBeNull();
        });
    });

    describe("serializeSSAO2RenderingPipeline", () => {
        test("should serialize the ssao2 pipeline and return an object", () => {
            const ssao = createSSAO2RenderingPipeline(editor);
            ssao.samples = 32;

            const serializationData = serializeSSAO2RenderingPipeline();

            expect(serializationData.samples).toBe(ssao.samples);
        });
    });

    describe("serializeSSAO2RenderingPipeline", () => {
        test("should return null if no pipeline is available", () => {
            expect(serializeSSAO2RenderingPipeline()).toBeNull();
        });

        test("should serialize the ssao2 pipeline and return an object", () => {
            const ssao = createSSAO2RenderingPipeline(editor);
            ssao.samples = 3712;

            const serializationData = serializeSSAO2RenderingPipeline();

            expect(serializationData.samples).toBe(ssao.samples);
        });
    });

    describe("parseSSAO2RenderingPipeline", () => {
        test("should configure the existing pipeline", () => {
            const ssao1 = createSSAO2RenderingPipeline(editor);

            const serializationData = serializeSSAO2RenderingPipeline();
            serializationData.samples = 3712;

            const ssao2 = parseSSAO2RenderingPipeline(editor, serializationData);

            expect(ssao2).toBe(ssao1);
            expect(ssao1.samples).toBe(3712);

            disposeSSAO2RenderingPipeline();
        });

        test("should configure a new pipeline", () => {
            const ssao1 = createSSAO2RenderingPipeline(editor);

            const serializationData = serializeSSAO2RenderingPipeline();
            serializationData.samples = 3712;

            disposeSSAO2RenderingPipeline();

            const ssao2 = parseSSAO2RenderingPipeline(editor, serializationData);

            expect(ssao2).not.toBe(ssao1);
            expect(ssao2.samples).toBe(3712);
        });
    });
});
