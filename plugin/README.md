# Supplement Intelligence ChatGPT plugin preparation

The website now exposes a stable read-only API intended to support a future MCP plugin.

## API
- /api/v1
- /api/v1/search?q=
- /api/v1/products
- /api/v1/products/{slug}
- /api/v1/ingredients
- /api/v1/ingredients/{slug}
- /openapi.json

## Current phase
The MCP server itself is not deployed yet. The next implementation phase is to wrap these endpoints with a small remote MCP server and expose focused read-only tools.

See:
- plugin/TOOL_DESIGN.md
- openapi.json
- docs/EVIDENCE_METHOD.md
