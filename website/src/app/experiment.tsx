import Link from "next/link";
import { PropsWithChildren } from "react";
import { Fade } from "react-awesome-reveal";
import { FaCirclePlay, FaYoutube } from "react-icons/fa6";
import { IoMdPlayCircle } from "react-icons/io";

export interface IExperimentProps extends PropsWithChildren {
	title: string;
	coverVideo: string;
	youtubeVideo: string;
	liveLink: string;

	mobile: boolean;
	mobileAvailable: boolean;
}

export function Experiment(props: IExperimentProps) {
	return (
		<div className="flex flex-col gap-20 justify-center items-center w-full px-5 lg:pt-20 lg:pb-10">
			<Fade triggerOnce>
				<div className="text-5xl md:text-7xl lg:text-8xl xl:text-9xl font-semibold font-sans drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)] tracking-tighter text-center px-5">
					{props.title}
				</div>
			</Fade>

			<Fade triggerOnce delay={150}>
				<div className="group relative w-full lg:max-w-[50vw] border-[10px] border-black/80 rounded-lg select-none cursor-pointer">
					<video loop muted autoPlay playsInline className="w-full h-full object-cover">
						<source src={props.coverVideo} type="video/mp4" />
					</video>

					<Link
						target="_blank"
						href={props.mobile && !props.mobileAvailable ? props.youtubeVideo : props.liveLink}
						className={`
                            absolute top-0 left-0 flex flex-col justify-center items-center w-full h-full
                            opacity-0 group-hover:opacity-100
                            transition-all duration-300 ease-in-out
                        `}
					>
						<button className="text-neutral-950 hover:text-neutral-100 transition-all duration-300 ease-in-out">
							<IoMdPlayCircle className="w-32 h-32" />
						</button>
					</Link>
				</div>
			</Fade>

			<Fade triggerOnce delay={300}>
				<div className="leading-6 drop-shadow-[0_1px_1px_rgba(0,0,0,1)]">{props.children}</div>
			</Fade>

			<div className="flex flex-col sm:flex-row items-center gap-5">
				{(!props.mobile || props.mobileAvailable) && (
					<Fade triggerOnce delay={450}>
						<Link target="_blank" href={props.liveLink}>
							<button className="flex items-center gap-2 text-black bg-neutral-50 rounded-full px-5 py-2">
								<FaCirclePlay className="w-6 h-6" />
								Run experiment
							</button>
						</Link>
					</Fade>
				)}

				<Fade triggerOnce delay={450}>
					<Link target="_blank" href={props.youtubeVideo}>
						<button
							className={`flex items-center gap-2 ${props.mobile && !props.mobileAvailable ? "text-black bg-neutral-50" : "text-white bg-black"} rounded-full px-5 py-2`}
						>
							<FaYoutube className="w-6 h-6" />
							Watch on Youtube
						</button>
					</Link>
				</Fade>
			</div>
		</div>
	);
}
