import { Component, ReactNode } from "react";

import { ExperimentStep } from "./page";

export interface IMenuComponentsProps {
    step: ExperimentStep;
    onStart: () => void;
}

export class MainMenuComponent extends Component<IMenuComponentsProps> {
    private _title: HTMLDivElement = null!;
    private _startButton: HTMLButtonElement = null!;

    public render(): ReactNode {
        return (
            <div className="absolute top-1/2 lg:top-1/3 left-1/2 lg:left-3/4 -translate-x-1/2 -translate-y-1/2 flex flex-col justify-center items-center gap-5">
                <div
                    ref={(r) => this._title = r!}
                    className={`
                        text-5xl md:text-9xl font-semibold text-white font-sans drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)] tracking-tighter opacity-0 pointer-events-none select-none
                        transition-opacity duration-3000 ease-in-out
                    `}
                >
                    Mansion
                </div>

                <button
                    disabled={this.props.step !== "menu"}
                    ref={(r) => this._startButton = r!}
                    onClick={() => this.props.onStart()}
                    className={`
                        flex items-center gap-2 text-black bg-neutral-50 rounded-full px-5 py-2 opacity-0
                        transition-opacity duration-1000 ease-in-out
                    `}
                >
                    Start
                </button>
            </div>
        );
    }

    public show(): void {
        this._title.style.opacity = "1";

        setTimeout(() => {
            this._startButton.style.opacity = "1";
        }, 3000);
    }

    public async hideStartButton(): Promise<void> {
        this._startButton.style.opacity = "0";
    }

    public async hideTitle(): Promise<void> {
        this._title.style.opacity = "0";
    }
}
