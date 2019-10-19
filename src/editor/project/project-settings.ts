import Editor from '../editor';

import Window from '../gui/window';
import Form from '../gui/form';

export default class ProjectSettings {
    // Public members
    public static ProjectExportFormat: 'babylon' | 'glb' | 'gltf' = 'babylon';
    public static ExportEulerAngles: boolean = false;

    /**
     * Shows the scene settings dialog to modify properties.
     * @param editor the editor reference.
     */
    public static async ShowDialog (editor: Editor): Promise<void> {
        // Create format window
        const window = new Window('ExportTemplate');
        window.buttons = ['Ok', 'Cancel'];
        window.width = 450;
        window.height = 170;
        window.body = `<div id="EXPORT-TEMPLATE-FORMAT" style="width: 100%; height: 100%;"></div>`;
        window.open();

        // Create form
        const form = new Form('SceneFormatForm');
        form.fields = [
            { name: 'exportEulerAngles', type: 'checkbox', html: { span: 10, caption: 'Export Euler angles instead of quaternions' } },
            { name: 'format', type: 'list', required: true, html: { span: 10, caption: 'Format' }, options: { items: ['babylon', 'glb', 'gltf'] } }
        ];
        form.build('EXPORT-TEMPLATE-FORMAT');

        form.element.record['format'] = this.ProjectExportFormat;
        form.element.record['exportEulerAngles'] = this.ExportEulerAngles;
        form.element.refresh();

        return new Promise<void>((resolve, reject) => {
            // Events
            window.onButtonClick = (id => {
                if (id === 'Cancel') {
                    window.close();
                    return reject('User decided to close project settings');
                }
                
                this.ProjectExportFormat = form.element.record['format'].id;
                this.ExportEulerAngles = form.element.record['exportEulerAngles'];

                window.close();

                this.ApplySettings(editor);
                resolve();
            });

            window.onClose = (() => form.element.destroy());
        });
    }

    /**
     * Applies the settings once the user closes the dialog by clicking on "Ok".
     * @param editor the editor reference.
     */
    public static ApplySettings (editor: Editor): void {
        // Rotations
        if (ProjectSettings.ExportEulerAngles) {
            editor.core.scene.meshes.forEach(m => {
                if (m.rotationQuaternion) {
                    m.rotation = m.rotationQuaternion.toEulerAngles();
                    m.rotationQuaternion = null;
                }
            });
        } else {
            editor.core.scene.meshes.forEach(m => {
                if (!m.rotationQuaternion) {
                    m.rotationQuaternion = m.rotation.toQuaternion();
                }

                m.rotation.set(0, 0, 0);
            });
        }
    }
}
