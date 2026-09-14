# Agent prompt mirrors

Each `*.md` file here mirrors the `prompt` field of the matching config in `.kiro/agents/`.

The runtime loads the JSON configs, not these files, so editing a `.md` here has no effect on
agent behavior. They exist purely for readability and easier diff review of prompt changes.

Regenerate these mirrors after changing any agent config so they stay in sync with the JSON.
