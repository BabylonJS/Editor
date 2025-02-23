import { Observable } from "babylonjs";

export interface IProjectConfiguration {
    path: string | null;
    compressedTexturesEnabled: boolean;
}

export const projectConfiguration: IProjectConfiguration = {
    path: null,
    compressedTexturesEnabled: false,
};

export const onProjectConfigurationChangedObservable = new Observable<IProjectConfiguration>();
