module BABYLON.EDITOR.EXTENSIONS {
    export class BehaviorTools {
        // Private members
        private _postProcessBuilder = <PostProcessBuilderExtension> EditorExtension.GetExtensionByName("PostProcessBuilder");

        // Returns an editor built post-process giving its name
        public getPostProcess(name: string): IProcessedPostProcess {
            return this._postProcessBuilder.getPostProcess(name);
        }
    }
}
