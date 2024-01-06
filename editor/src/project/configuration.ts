import { Observable } from "babylonjs";

export interface IProjectConfiguration {
    path: string | null;
}

export const projectConfiguration: IProjectConfiguration = {
    path: null,
};

export const onProjectConfigurationChangedObservable = new Observable<IProjectConfiguration>();
