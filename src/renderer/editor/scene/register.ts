import { Node, Vector3, TargetCamera } from "babylonjs";

Node.AddNodeConstructor("TargetCamera", (name, scene) => {
    return () => new TargetCamera(name, Vector3.Zero(), scene);
});
