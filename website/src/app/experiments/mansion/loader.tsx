import { Grid } from "react-loader-spinner";

export interface ILoaderComponentProps {
    loading: boolean;
    progress: number;
}

export function LoaderComponent(props: ILoaderComponentProps) {
    return (
        <>
            <div
                className={`
                    absolute top-0 left-0 w-full h-full bg-black pointer-events-none
                    ${props.loading ? "opacity-100" : "opacity-0"}
                    transition-all duration-1000 ease-in-out
                `}
            >
                <Grid
                    width={24}
                    height={24}
                    color="#ffffff"
                    wrapperClass="absolute right-5 bottom-5 pointer-events-none"
                />

                <div className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 pointer-events-none dark">
                    <div className="text-5xl md:text-9xl text-white font-sans drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)] tracking-tighter">
                        {props.progress * 100 >> 0}%
                    </div>
                </div>
            </div>
        </>
    );
}
