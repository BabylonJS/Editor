"use client";

import { CodeBlock, CustomLink, DocPage, DocHeading, DocVideo } from "../../components";

import { assignScriptSprite, assignScriptSpriteManager, getAnimationSprite, playAnimationSprite } from "./scripts";

export default function DocumentationUsingSpriteManagerPage() {
	return (
		<DocPage>
			<DocHeading level={2}>Introduction</DocHeading>

			<p>
				The editor provides support for using Sprite managers in your scenes. Sprite managers allow to efficiently render a large number of sprites in the scene using a
				single texture. More information about sprite managers{" "}
				<CustomLink href="https://doc.babylonjs.com/features/featuresDeepDive/sprites/sprites_introduction/">here</CustomLink>.
			</p>

			<p>
				To create a new sprite manager, just right-click somewhere in the graph and select <b>Sprite Manager</b>. The sprite manager will be created with default parameters
				and no asset assigned to it.
			</p>

			<p>
				Once created, the sprite manager can be configured using the inspector by selecting it in the graph. A sprite manager can use either a single texture or a pair of
				JSON atlas with a texture.
			</p>

			<DocVideo src="/documentation/sprites/using-sprite-manager/creating-sprite-manager.mp4" />

			<DocHeading level={2}>Configuring with single texture</DocHeading>

			<p>
				When using a single texture for the sprite manager, simply drag'n'drop the desired image asset in the <b>Texture</b> property of the inspector. The image will be
				used as the texture for all sprites created with this manager. Once the texture is assigned, you'll be able to create sprites using this manager.
			</p>

			<DocVideo src="/documentation/sprites/using-sprite-manager/setting-texture.mp4" />

			<p>
				By default, the sprite dimensions are set to <b>64x64</b>. This can be customized by setting the <b>Cell Width</b> and <b>Cell Height</b> properties in the
				inspector to the desired values. When dimensions changed the grid of all instantiable sprites will be updated accordingly.
			</p>

			<p>To add a new sprite in the scene, simply drag'n'drop the desired sprite from the grid to the scene. The sprite will be created at the dropped position.</p>

			<DocVideo src="/documentation/sprites/using-sprite-manager/creating-sprite.mp4" />

			<DocHeading level={2}>Configuring with Atlas JSON</DocHeading>

			<p>
				When using an atlas JSON file, both the JSON file and the associated texture must be assigned to the sprite manager. To do so, select the <b>Packed</b> mode and
				simply drag'n'drop the JSON file in the <b>Atlas JSON</b> property of the inspector. The editor will automatically search for the associated texture in the assets
				and assign it to the <b>Texture</b> property.
			</p>

			<p>
				Compared to using a single texture, using an atlas JSON allows to have sprites of varying sizes and not constrained to a fixed grid. In other words, no need to
				configure <b>Cell Width</b> and <b>Cell Height</b>. Once the atlas JSON is assigned, you'll be able to create sprites by drag'n'dropping them from the grid to the
				scene.
			</p>

			<DocVideo src="/documentation/sprites/using-sprite-manager/setting-atlas-json.mp4" />

			<DocHeading level={2}>Assigning script to a Sprite</DocHeading>

			<p>
				Scripts can be assigned to individual sprites created from a sprite manager. When assigning a script to a sprite, the sprite instance can be accessed in the script
				using the <b>Sprite</b> type from the <b>@babylonjs/core</b> package:
			</p>

			<CodeBlock code={assignScriptSprite} />

			<DocHeading level={2}>Adding animations</DocHeading>

			<p>Sprite managers support animations. Animations can be created per sprite.</p>

			<p>
				To add a new animation, click the <b>+</b> button. A new animation will be created with default parameters. You can then customize the animation by setting the{" "}
				<b>Name</b>, <b>From</b>, <b>To</b> and <b>Delay</b> properties in the inspector. To play the selected animation just click the <b>Play</b> button or the{" "}
				<b>Stop</b> button to stop it.
			</p>

			<p>
				To remove an animation, select it in the list and click the <b>-</b> button.
			</p>

			<DocVideo src="/documentation/sprites/using-sprite-manager/sprite-create-animation.mp4" />

			<p>
				To play an animation from a script, you can use the <b>playSpriteAnimationFromName</b> function from the <b>babylonjs-editor-tools</b> package. This function allows
				to play an animation by its name:
			</p>

			<CodeBlock code={playAnimationSprite} />

			<p>
				Alternatively, you can use the <b>animationFromSprite</b> decorator from the <b>babylonjs-editor-tools</b> package to easily retrieve an animation by its name and
				play it:
			</p>

			<CodeBlock code={getAnimationSprite} />

			<DocHeading level={2}>Assigning script to Sprite Manager</DocHeading>

			<p>
				Sprite managers are represented as nodes in the editor. A special type exists for them in the <b>babylonjs-editor-tools</b> package: <b>SpriteManagerNode</b>. When
				assigning a script to a Sprite Manager node, the node instance can be accessed in the script using the <b>SpriteManagerNode</b> type.
			</p>

			<p>
				To access the <b>SpriteManager</b> instance of Babylon.js, use the <b>.spriteManager</b> property of the node:
			</p>

			<CodeBlock code={assignScriptSpriteManager} />
		</DocPage>
	);
}
