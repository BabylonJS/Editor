export type VisibleInInspectorDecoratorObject = {
    label?: string;
    propertyKey: string;
    configuration: VisibleInInspectorDecoratorConfiguration;
};

export type VisibleInInspectorDecoratorConfiguration = {
    type: string;

    min?: number;
    max?: number;
    step?: number;

    asDegrees?: boolean;
};

export const scriptValues = "values";

export function computeDefaultValuesForObject(script: any, output: VisibleInInspectorDecoratorObject[]) {
    script[scriptValues] ??= {};

    const attachedScripts = script[scriptValues];
    const existingKeys = Object.keys(attachedScripts);

    // Clean non existing values
    existingKeys.forEach((key) => {
        const existingOutput = output.find((value) => value.propertyKey === key);
        if (!existingOutput) {
            return delete attachedScripts[key];
        }
    });

    output.forEach((value) => {
        switch (value.configuration.type) {
            case "boolean":
                attachedScripts[value.propertyKey] = {
                    type: value.configuration.type,
                    value: attachedScripts[value.propertyKey]?.value ?? false,
                };
                break;

            case "number":
                attachedScripts[value.propertyKey] = {
                    type: value.configuration.type,
                    value: attachedScripts[value.propertyKey]?.value ?? value.configuration.min ?? value.configuration.max ?? 0,
                };
                break;

            case "vector2":
                attachedScripts[value.propertyKey] = {
                    type: value.configuration.type,
                    value: [
                        attachedScripts[value.propertyKey]?.value[0] ?? value.configuration.min ?? value.configuration.max ?? 0,
                        attachedScripts[value.propertyKey]?.value[1] ?? value.configuration.min ?? value.configuration.max ?? 0,
                    ],
                };
                break;

            case "vector3":
                attachedScripts[value.propertyKey] = {
                    type: value.configuration.type,
                    value: [
                        attachedScripts[value.propertyKey]?.value[0] ?? value.configuration.min ?? value.configuration.max ?? 0,
                        attachedScripts[value.propertyKey]?.value[1] ?? value.configuration.min ?? value.configuration.max ?? 0,
                        attachedScripts[value.propertyKey]?.value[2] ?? value.configuration.min ?? value.configuration.max ?? 0,
                    ],
                };
                break;
        }
    });
}
