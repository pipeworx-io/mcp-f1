# mcp-f1

F1 MCP — Formula 1 data via the Ergast API

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1394+ live data sources.

## Tools

| Tool | Description |
|------|-------------|
| `get_current_standings` | Check current F1 driver championship standings. Returns position, points, wins, driver name, and constructor for all drivers. |
| `get_race_results` | Get race results for a specific F1 grand prix. Provide season year and round number (e.g., 2024, round 5). Returns finishing position, driver, constructor, status, and points. |
| `get_schedule` | Get the F1 season race calendar. Provide year (e.g., 2024). Returns all rounds with race name, circuit, location, and date. |
| `get_driver` | Look up F1 driver profile by ID. Returns name, car number, nationality, and date of birth. |

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "f1": {
      "url": "https://gateway.pipeworx.io/f1/mcp"
    }
  }
}
```

Or connect to the full Pipeworx gateway for access to all 1394+ data sources:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English:

```
ask_pipeworx({ question: "your question about F1 data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
