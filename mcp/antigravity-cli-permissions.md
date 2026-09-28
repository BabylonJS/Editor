# Always allowing the editor tools in Antigravity CLI

When the AI assistant of the editor runs **Antigravity CLI** (Gemini), Antigravity asks for confirmation each time it
calls a tool of the editor:

```text
babylonjs_editor/create_light

Allow calling this tool?
> 1. Yes, allow tool call
  2. Yes, and always allow tool 'babylonjs_editor/create_light' in this conversation
  3. Yes, and always allow tool 'babylonjs_editor/create_light' (Persist to settings.json)
  4. No, deny tool call
  ...
```

Unlike Claude Code and Codex, Antigravity CLI can't be given allowed tools for a single session, so the editor can't
allow them for you. You can allow them yourself, once, in the settings of Antigravity CLI.

## Allow all the tools of the editor

1. Open the settings file of Antigravity CLI: `~/.gemini/antigravity-cli/settings.json`
   (`%USERPROFILE%\.gemini\antigravity-cli\settings.json` on Windows). Create it if it doesn't exist.
2. Add `mcp(babylonjs_editor/*)` to the `allow` list of `permissions`:

    ```json
    {
    	"permissions": {
    		"allow": ["mcp(babylonjs_editor/*)"]
    	}
    }
    ```

    If the file already has other settings or rules, keep them and only add the rule to the list.

3. Start a new conversation from the assistant panel (the **+** button).

Antigravity CLI now calls the tools of the editor without asking. It still asks for its own tools, like running
commands in the terminal or reading URLs.

> `babylonjs_editor` is the name of the MCP server the assistant gives to Antigravity CLI. If you connected the MCP
> server of the editor to Antigravity CLI yourself, use the name you gave it instead.

## Allow only some tools

Allowing all the tools also allows the ones that delete nodes, write and attach scripts, run automation scripts in the
editor, and play the scene (which runs the scripts of the project). To keep being asked for those, allow tools one by
one instead:

- **From the confirmation**: choose **3. Yes, and always allow tool '…' (Persist to settings.json)**. Antigravity CLI
  adds the tool to your settings and won't ask again, in any conversation. Option **2** allows it until the end of the
  conversation only.
- **From the settings file**: add one `mcp(babylonjs_editor/<tool>)` rule per tool, for example:

    ```json
    {
    	"permissions": {
    		"allow": [
    			"mcp(babylonjs_editor/get_scene_hierarchy)",
    			"mcp(babylonjs_editor/get_screenshot)",
    			"mcp(babylonjs_editor/create_light)",
    			"mcp(babylonjs_editor/set_node_properties)"
    		]
    	}
    }
    ```

You can also review and change these rules with the `/permissions` command of Antigravity CLI.

## Keep asking for some tools

Rules in `deny` and `ask` win over `allow` (deny > ask > allow). To allow everything except a few tools:

```json
{
	"permissions": {
		"allow": ["mcp(babylonjs_editor/*)"],
		"ask": ["mcp(babylonjs_editor/delete_node)", "mcp(babylonjs_editor/run_agent_script)", "mcp(babylonjs_editor/play_scene)"]
	}
}
```

Saving the project is always confirmed by the editor itself, whatever the rules: the assistant never saves without
you.
