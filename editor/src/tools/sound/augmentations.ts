export { Sound } from "babylonjs";

declare module "babylonjs" {
    export interface Sound {
        id: string;
        uniqueId: number;
    }
}
