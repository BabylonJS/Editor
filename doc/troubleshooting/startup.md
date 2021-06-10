# Startup

It has been noticed that sometimes the Editor can't be started (or at least with WebGL errors) and then can't be
used. That problem has been noticed mostly on devices using Intel HD Graphics.

---

## Intel HD Graphics
There are 2 options to fix the startup problem

### Changing Windows settings
- Open the Windows settings and search for `Graphics Settings`.
- In `Graphics Performance Preference`, select `Desktop App` in the drop down and then browse to the `BabylonJSEditor.exe`, you should now see it added to the list.
- Click on `Babylon JS Editor` in the list and click `Options`.
- Set your preference to `High Performance Mode`.
- Close and reopen the Editor.

### Updating the Intel UHD driver
[Install the Generic Intel DCH graphics driver](https://downloadcenter.intel.com/download/30381/Intel-Graphics-Windows-10-DCH-Drivers) (the `Driver Support Assistant` is recommanded).
Read the caveat, but in short: your default drivers are usually customized by the manufacturer, but this generic driver is not. Obviously you run the risk of screwing something up.

---

## References

Linked issue: https://github.com/BabylonJS/Editor/issues/278