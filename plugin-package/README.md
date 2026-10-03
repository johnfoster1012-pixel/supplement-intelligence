# Supplement Intelligence portable plugin package v1.2.0

This folder is the portable Agent Plugins package for Supplement Intelligence.

## Contents

- `plugin.json` — portable plugin manifest
- `mcp.json` — remote Streamable HTTP MCP server configuration
- `skills/supplement-evidence-research/SKILL.md` — workflow and evidence-interpretation instructions
- `EVALS.md` — golden prompts and failure conditions

## V1.2 evidence contract

V1.2 adds structured review-level evidence for the enriched ingredient records. The plugin receives the evidence finding together with population/scope and limitations so it can explain review-level evidence without converting pooled findings into finished-product claims.

## MCP server

https://mcp.supplement-intelligence.com/mcp

The production deployment includes an automated MCP client smoke test that initializes the connection, lists the tools, verifies synonym resolution, checks freshness metadata, and exercises ingredient and product calls.

## Before public submission

Test the server in ChatGPT Developer mode and exercise the prompts in `EVALS.md`. Review public-directory metadata, legal/privacy URLs, branding assets, and submission requirements before uploading a release ZIP.

## Canonical release artifact

The plugin-package workflow runs on pull requests and on pushes to `main`. For public submission, use the ZIP artifact produced from the current `main` commit rather than a feature-branch artifact.

See `docs/PLUGIN_RELEASE_CHECKLIST.md` for the full release and submission sequence.
