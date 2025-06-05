import { Animation, IAnimationKey, Vector2, Vector3, Quaternion, Color3, Color4 } from "babylonjs";

import { getAnimationTypeForObject } from "../../../../tools/animation/tools";

import { EditorInspectorColorField } from "../../inspector/fields/color";
import { EditorInspectorVectorField } from "../../inspector/fields/vector";
import { EditorInspectorNumberField } from "../../inspector/fields/number";

import { CinematicEditor } from "../editor";

export function getTangentDefaultValue(key: IAnimationKey): number | Vector2 | Vector3 | Quaternion | Color3 | Color4 | null {
    const animationType = getAnimationTypeForObject(key.value);

    switch (animationType) {
        case Animation.ANIMATIONTYPE_FLOAT: return 0;
        case Animation.ANIMATIONTYPE_VECTOR2: return Vector2.Zero();
        case Animation.ANIMATIONTYPE_VECTOR3: return Vector3.Zero();
        case Animation.ANIMATIONTYPE_QUATERNION: return Quaternion.Zero();
        case Animation.ANIMATIONTYPE_COLOR3: return Color3.Black();
        case Animation.ANIMATIONTYPE_COLOR4: return Color3.Black().toColor4(0);
        default: return null;
    }
}

export function getTangentInspector(key: IAnimationKey, property: "inTangent" | "outTangent", cinematicEditor: CinematicEditor) {
    const animationType = getAnimationTypeForObject(key.value);

    switch (animationType) {
        case Animation.ANIMATIONTYPE_FLOAT:
            return <EditorInspectorNumberField object={key} property={property} onChange={() => cinematicEditor.timelines.updateTracksAtCurrentTime()} />;
        case Animation.ANIMATIONTYPE_VECTOR3:
            return <EditorInspectorVectorField object={key} property={property} onChange={() => cinematicEditor.timelines.updateTracksAtCurrentTime()} />;

        case Animation.ANIMATIONTYPE_COLOR3:
        case Animation.ANIMATIONTYPE_COLOR4:
            return <EditorInspectorColorField object={key} property={property} noColorPicker noClamp onChange={() => cinematicEditor.timelines.updateTracksAtCurrentTime()} />;
        default: return null;
    }
}
