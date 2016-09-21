module BABYLON.EDITOR {
    interface IStatusBarItem {
        id: string;
    }

    export class StatusBar {
        // Public members
        public panel: GUI.IGUIPanel;

        // Private members
        private _core: EditorCore;
        private _element: JQuery;
        private _elements: IStatusBarItem[] = [];

        /**
        * Constructor
        * @param core: the editor core instance
        */
        constructor(core: EditorCore) {
            // Initialize
            this._core = core;
            this._element = $("#BABYLON-EDITOR-BOTTOM-PANEL");

            this.panel = core.editor.layouts.getPanelFromType("bottom");
            core.editor.layouts.setPanelSize("bottom", 0);

            var statusBarId = "ONE-DRIVE-STATUS-BAR";
            this.addElement(statusBarId, "Exporting...", "icon-one-drive");
            this.showSpinner(statusBarId);
        }

        // Add a new element in the status bar
        public addElement(id: string, text: string, img?: string, right?: boolean): void {
            right = right || false;

            this._core.editor.layouts.setPanelSize("bottom", 35);
            this._element.append(
                "<div id=\"" + id + "\" style=\"float: " + (right ? "right" : "left") + "; height: 100%;\">" +
                    (img ? "<img id=\"" + id + "_img\" class=\"w2ui-icon " + img + "\ style=\"display: inline;\"></img>" : "") +
                    "<div id=\"" + id + "_spinner\" class=\"w2ui-spinner\" style=\"width: 20px; height: 20px; display: none;\"></div>" +
                    "<p id=\"" + id + "_text\" style=\"height: 100%; display: inline; vertical-align: super;\">\t" + text + "\t</p>" +
                    "<div id=\"" + id + "_separator\" style=\"border-left:1px solid grey; height: 100%; display: inline-block;\"></div>" +
                "</div>"
            );

            this._elements.push({
                id: id
            });
        }

        // Remove an existing element from the status bar
        public removeElement(id: string): boolean {
            for (var i = 0; i < this._elements.length; i++) {
                var element = this._elements[i];

                if (element.id === id) {
                    var htmlElement = $("#" + id, this._element);
                    htmlElement.empty();
                    htmlElement.remove();

                    this._elements.splice(i, 1);

                    if (this._elements.length === 0)
                        this._core.editor.layouts.setPanelSize("bottom", 0);

                    return true;
                }
            }

            return false;
        }

        // Shows the spinner of an element
        public showSpinner(id: string): void {
            var spinner = $("#" + id + "_spinner", this._element);
            spinner.css("display", "inline-block");
        }

        // Hides the spinner of an element
        public hideSpinner(id: string): void {
            var spinner = $("#" + id + "_spinner", this._element);
            spinner.css("display", "none");
        }
    }
}
