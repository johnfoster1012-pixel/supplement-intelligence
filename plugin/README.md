# Supplement Intelligence ChatGPT plugin

Supplement Intelligence now has a dedicated remote MCP Worker backed by the site's verification-first read-only API.

## Remote MCP endpoint

`https://mcp.supplement-intelligence.com/mcp`

## V1 tools

- `search_supplement_intelligence`
- `get_ingredient_evidence`
- `get_product_formulation`
- `list_reviewed_ingredients`

## Intended user value

The plugin helps people:
- find reviewed supplement ingredient evidence
- inspect study context and safety
- inspect current tracked product formulations
- understand whether ingredient evidence directly applies to a finished product

It does not provide diagnosis, personalized dosage, treatment recommendations, supplement rankings, or finished-product efficacy conclusions that the underlying evidence has not established.

## Developer-mode test

After the MCP Worker is deployed:
1. In ChatGPT, enable Developer mode under Settings → Security and login.
2. Open Plugins and add a new MCP server.
3. Enter `https://mcp.supplement-intelligence.com/mcp`.
4. Install the personal plugin.
5. Test it in a new Work conversation.

See `plugin/TOOL_DESIGN.md` and `mcp-server/README.md`.
