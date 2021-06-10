# Blurred UI

The Babylon.JS Editor is based on the Electron Framework. On Win32 systems it has been noticed that on
specific configurations the overall UI of the Editor can be blurred.

This can be fixed by updating the drivers of the video card to the latest version.

In case of RTX NVidia video cards, try installing the `Studio` driver version instead of the `Game`one.

In case of NVidia video cards in general, try running the `NVidia Control Panel` and select `No Scaling` in the display settings.

## References
Linked issue: https://github.com/BabylonJS/Editor/issues/266
