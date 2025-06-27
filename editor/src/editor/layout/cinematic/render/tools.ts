import { join } from "path/posix";
import { writeFile } from "fs-extra";

import { ArrayBufferTarget, Muxer } from "webm-muxer";

import { ISize } from "babylonjs";

import { RenderType } from "./render";

export function getVideoDimensions(type: RenderType): ISize {
	switch (type) {
		case "720p":
			return { width: 1280, height: 720, };
		case "1080p":
			return { width: 1920, height: 1080, };
		case "4k":
			return { width: 3840, height: 2160, };
	}
}

export function createVideoEncoder(width: number, height: number) {
	const muxer = new Muxer({
		target: new ArrayBufferTarget(),
		video: {
			width,
			height,
			frameRate: 60,
			codec: 'V_VP9',
		},
		firstTimestampBehavior: "offset",
	});

	const videoEncoder = new VideoEncoder({
		error: (e) => {
			console.error(e);
		},
		output: (chunk, meta) => {
			muxer.addVideoChunk(chunk, meta);
		},
	});

	videoEncoder.configure({
		width,
		height,
		framerate: 60,
		bitrate: 50_000_000,
		codec: "vp09.00.10.08",
		latencyMode: "quality",
		avc: {
			format: 'annexb',
		},
	});

	return {
		muxer,
		videoEncoder,
	};
}

export function encodeVideoFrame(canvas: HTMLCanvasElement, videoEncoder: VideoEncoder, frame: number): void {
	const videoFrame = new VideoFrame(canvas, {
		timestamp: (1000 / 60) * frame * 1000,
	});

	videoEncoder.encode(videoFrame, {
		keyFrame: frame % 30 === 0,
	});

	videoFrame.close();
}

export type FlushVideoEncoderOptions = {
    destinationFolder: string;
    videoIndex: number;
    width: number;
    height: number;
    videoEncoder: VideoEncoder;
    muxer: Muxer<ArrayBufferTarget>;
};

export async function flushVideoEncoder(options: FlushVideoEncoderOptions) {
	await options.videoEncoder.flush();
	options.muxer.finalize();

	await writeFile(join(options.destinationFolder, `${options.videoIndex}.webm`), Buffer.from(options.muxer.target.buffer));

	return createVideoEncoder(options.width, options.height);
}
