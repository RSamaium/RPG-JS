---
title: "Studio overview"
description: "Use RPGJS Studio with AI assistants such as Claude Code, Codex, or similar tools."
---

# Studio overview

RPGJS Studio can be used directly from an AI coding assistant such as Claude Code, Codex, or any similar tool that supports skills.

## In this section

- What the Studio skill is for
- How to install the RPGJS Studio skill
- How to create and configure the Studio API key

## Recommended workflow

1. Install the shared skill:

```bash
npx skills add https://github.com/RSamaium/RPG-JS#v5
```

2. When the tool asks which skill to install, choose `RPGJS Studio`.
3. Create an API key from [RPGJS Studio API keys](https://rpgjs.studio/api-keys).
4. Add the key to your environment with `RPGSTUDIO_API_KEY`.

Example:

```bash
export RPGSTUDIO_API_KEY="your-api-key"
```

Or in a `.env` file:

```dotenv
RPGSTUDIO_API_KEY=your-api-key
```