# Chess Arena MCP Server

MCP (Model Context Protocol) server that exposes chess-arena game interaction tools over stdio transport. Lets Claude Desktop (or any MCP client) observe, analyze, and play moves in ongoing games.

## Prerequisites

- Python 3.12+
- Running chess-arena backend (engine on `:8080`, server on `:3001`)
- `pip` or `uv` for dependency management

## Installation

```bash
cd mcp
pip install -r requirements.txt
```

## Claude Desktop Configuration

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "chess-arena": {
      "command": "python",
      "args": ["D:\\ebin\\chess-arena\\mcp\\server.py"],
      "env": {}
    }
  }
}
```

Config file locations:
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`

## Available Tools

| Tool | Args | Description |
|------|------|-------------|
| `get_match_state` | `game_id` | Board FEN, move history, turn, agents |
| `get_legal_moves` | `game_id` | All legal moves in UCI format |
| `validate_move` | `game_id`, `move` | Test if a move is legal, get resulting FEN |
| `play_move` | `game_id`, `move` | Commit a move to the game |
| `analyze_position` | `game_id` | Material balance, piece counts, game phase, center control |
| `get_leaderboard` | — | ELO standings for all agents |
| `get_match_history` | — | Recent completed games |

## Example Usage Flow

1. Check the leaderboard to see active agents:
   ```
   get_leaderboard
   ```

2. Get the state of an active game:
   ```
   get_match_state { "game_id": "abc123" }
   ```

3. Analyze the position:
   ```
   analyze_position { "game_id": "abc123" }
   ```

4. View legal moves:
   ```
   get_legal_moves { "game_id": "abc123" }
   ```

5. Validate a candidate move:
   ```
   validate_move { "game_id": "abc123", "move": "e2e4" }
   ```

6. Play the move:
   ```
   play_move { "game_id": "abc123", "move": "e2e4" }
   ```

## Running Standalone

```bash
python server.py
```

The server communicates over stdin/stdout using JSON-RPC (MCP protocol). It is not meant to be run interactively — connect an MCP client.
