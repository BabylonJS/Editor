import { Grid } from "react-loader-spinner";

export interface ILoaderComponentProps {
    loading: boolean;
}

export function LoaderComponent(props: ILoaderComponentProps) {
    return (
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
        </div>
    );
}
