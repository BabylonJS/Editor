import React from "react";

export interface IDocVideoProps {
	src: string;
	caption?: string;
	autoPlay?: boolean;
	loop?: boolean;
	muted?: boolean;
	controls?: boolean;
	className?: string;
}

export function DocVideo({ src, caption, autoPlay = true, loop = true, muted = true, controls = true, className = "" }: IDocVideoProps) {
	return (
		<figure className={`my-6 flex flex-col items-center w-full ${className}`}>
			<div className="w-full overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950/60 shadow-lg">
				<video src={src} autoPlay={autoPlay} loop={loop} muted={muted} controls={controls} playsInline className="w-full h-auto object-contain rounded-xl" />
			</div>
			{caption && <figcaption className="mt-2 text-center text-xs text-neutral-400">{caption}</figcaption>}
		</figure>
	);
}

export interface IDocImageProps {
	src: string;
	alt?: string;
	caption?: string;
	className?: string;
	imageClassName?: string;
}

export function DocImage({ src, alt = "", caption, className = "", imageClassName = "" }: IDocImageProps) {
	return (
		<figure className={`my-6 flex flex-col items-center w-full ${className}`}>
			<div className="w-full overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950/60 shadow-lg">
				<img src={src} alt={alt} className={`w-full h-auto object-contain rounded-xl ${imageClassName}`} />
			</div>
			{caption && <figcaption className="mt-2 text-center text-xs text-neutral-400">{caption}</figcaption>}
		</figure>
	);
}
