import { Component, ReactNode } from "react";

export class CinematicComponent extends Component {
	private _cinematicIntro: HTMLDivElement = null!;
	private _cinematicVideo: HTMLVideoElement = null!;

	public render(): ReactNode {
		return (
			<>
				<div
					ref={(r) => {
						this._cinematicIntro = r!;
					}}
					className={`
                        absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full flex flex-col justify-center items-center gap-10 opacity-0 pointer-events-none
                        transition-opacity duration-1000 ease-in-out
                    `}
				>
					<div className="text-white text-center w-full text-sm md:text-base lg:text-xl 2xl:text-3xl">
						May contain content inappropriate for children. The following cinematic is a proof of
						<br />
						concept, created entirely in real-time using Babylon.js Editor.
					</div>

					<div className="text-white italic text-center w-full text-sm md:text-base lg:text-xl 2xl:text-3xl">
						Experience the power of web-based rendering—crafted without a single line of code.
					</div>
				</div>

				<div className="absolute top-0 left-0 w-full h-full flex justify-center items-center pointer-events-none">
					<video
						muted
						ref={(r) => {
							this._cinematicVideo = r!;
						}}
						className="w-full h-full object-cover pointer-events-none invisible transition-opacity duration-2000 ease-in-out"
						src="https://babylonjs-editor.fra1.cdn.digitaloceanspaces.com/experiments/Babylonjs_introBumper.mp4"
					/>
				</div>
			</>
		);
	}

	public showIntro(): void {
		this._cinematicIntro.style.opacity = "1";
	}

	public hideIntro(): void {
		this._cinematicIntro.style.opacity = "0";
	}

	public showVideo(): void {
		this._cinematicVideo.style.visibility = "visible";
		this._cinematicVideo.play();

		this._cinematicVideo.style.opacity = "1";
	}

	public hideVideo(): void {
		this._cinematicVideo.style.opacity = "0";
		this._cinematicVideo.ontransitionend = () => {
			this._cinematicVideo.style.visibility = "hidden";
		};
	}
}
