# Supplement Intelligence portable plugin package

This folder is the portable Agent Plugins package for Supplement Intelligence.

## Contents

- `plugin.json` — portable plugin manifest
- `mcp.json` — remote Streamable HTTP MCP server configuration
- `skills/supplement-evidence-research/SKILL.md` — workflow and evidence-interpretation instructions
- `EVALS.md` — golden prompts and failure conditions

## MCP server

https://mcp.supplement-intelligence.com/mcp

The production deployment includes an automated MCP client smoke test that initializes the connection, lists the tools, and successfully calls `search_supplement_intelligence`.

## Before public submission

Test the server in ChatGPT Developer mode and exercise the prompts in `EVALS.md`. Review public-directory metadata, legal/privacy URLs, branding assets, and submission requirements before uploading a release ZIP.
