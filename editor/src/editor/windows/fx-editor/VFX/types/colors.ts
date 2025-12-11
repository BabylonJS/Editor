/**
 * VFX color types (converted from Quarks)
 */
export interface VFXConstantColor {
    type: "ConstantColor";
    value: [number, number, number, number]; // RGBA
}

export type VFXColor = VFXConstantColor | [number, number, number, number] | string;

