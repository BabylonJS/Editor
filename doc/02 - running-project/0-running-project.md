# Running the application/game

Once all dependencies have been installed and the game built, the game be ran using 2 methods:
* In an integrated browser: simply opens a new window with the application/game rendered in it
* In the default browser of the user: will start a local webserver and open the default browser of the user (FireFox for example).

For developers, running the game in the default browser of the user will allow to easily open the devtools (using F12) and debug the game.

By default, the Editor will open the integrated browser. To have options drawn in the Editor, simply `right-click` the `Play` button in the toolbar and select `Play in my browser`:

![PlayApplicationOrGame](./running/run.gif)

## Using custom webserver
In case of a custom webserver (for example using the dev server of Webpack or a completely handled webserver with custom APIs etc.), we'll have to manually open the browser pointing to the desired Url.

In fact, when clicking on the button `Play`, the editor will launch a basic webserver (that serves only files) to run the project. Once the basic webserver is started, the preview loads the Url `http://localhost:port/index.html`. That means, in case of a fully customized webserver/environment, that the preview feature should not be used anymore as the project is set to run in a fully customized environment.
