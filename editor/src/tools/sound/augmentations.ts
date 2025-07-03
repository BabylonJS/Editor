export { Sound } from "babylonjs";

declare module "babylonjs" {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    export interface Sound {
        id: string;
        uniqueId: number;
    }
}
