export interface FormField {
    name: string;
    type: 'text' | 'float' | 'int' | 'alphanumeric' | 'enum' | 'list' | string;

    required?: boolean;
    options?: {
        items?: string[];
    };
    html?: {
        caption?: string;
    }
}

export default class Form {
    // Public members
    public element: W2UI.W2Form = null;
    public name: string;

    public fields: FormField[] = [];

    public onChange: () => void;

    /**
     * Constructor
     * @param name the name of the form
     */
    constructor (name: string) {
        this.name = name;
    }

    /**
     * Returns if the form is valid
     */
    public isValid (): boolean {
        return this.element.validate().length === 0;
    }

    /**
     * Builds the form
     * @param parentId the parent id of the form
     */
    public build (parentId: string): void {
        this.element = $('#' + parentId).w2form({
            name: this.name,
            fields: this.fields,

            onChange: (event) => {
                event.onComplete = () => this.onChange && this.onChange();
            }
        });
    }
}