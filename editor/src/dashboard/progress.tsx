import { Component, ReactNode } from "react";

import { Grid } from "react-loader-spinner";

export interface IDashboardProgressComponentProps {
    name: string;
}

export interface IDashboardProgressComponentState {
    message: ReactNode;
}

export class DashboardProgressComponent extends Component<IDashboardProgressComponentProps, IDashboardProgressComponentState> {
    public constructor(props: IDashboardProgressComponentProps) {
        super(props);

        this.state = {
            message: "",
        };
    }

    public render(): ReactNode {
        return (
            <div className="flex gap-5 items-center w-full">
                <Grid width={24} height={24} color="gray" />

                <div className="flex flex-col">
                    <div className="text-xl font-[400]">
                        {this.props.name}
                    </div>
                    <div className="font-[400] text-muted-foreground">
                        {this.state.message}
                    </div>
                </div>
            </div>
        );
    }
}
