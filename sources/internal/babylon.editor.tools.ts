module BABYLON.EDITOR {
    export class Tools {
        /**
        * Returns a vector3 string from a vector3
        */
        public static GetStringFromVector3 = (vector: Vector3): string => {
            return "" + vector.x + ", " + vector.y + ", " + vector.z;
        };
        /**
        * Returns a vector3 from a vector3 string
        */
        public static GetVector3FromString = (vector: string): Vector3 => {
            var values = vector.split(",");
            return Vector3.FromArray([parseFloat(values[0]), parseFloat(values[1]), parseFloat(values[2])]);
        };
    }
}