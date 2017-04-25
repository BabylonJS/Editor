module BABYLON.EDITOR {
    export class SceneFactory2D {

        // Adds a new container2d
        static AddContainer2D(core: EditorCore): Container2D {
            var container = new Container2D("New Container", core.scene2d);
            container.id = SceneFactory.GenerateUUID();

            SceneFactory.ConfigureObject(container, core);

            return container;
        }

        // Adds a new sprite2d
        static AddSprite2D(core: EditorCore): Sprite2D {
            var sprite = new Sprite2D("New sprite", core.scene2d);
            sprite.id = SceneFactory.GenerateUUID();

            SceneFactory.ConfigureObject(sprite, core);

            return sprite;
        }
    }
}
