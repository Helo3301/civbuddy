# CivBuddy

An AOL-Instant-Messenger-flavored companion for **Civilization 4: Beyond the Sword** play-by-email (PBEM) games. Dial up, watch your buddy list, trade save files, and get an old-school *"You've got mail!"* ping when it's your turn.

Runs as a small FastAPI app on your tailnet/LAN. No cloud, no accounts you don't control.

## What it does

- **Buddy list + presence** — see who's online/away, set an away message.
- **Chat** — AOL-style IM windows.
- **Save trading = turn engine** — upload your `.CivBeyondSwordSave`, the turn flips to the next player automatically, and they get a WebSocket nudge to download and play.
- **Turn log** — every upload/download is recorded per game.

The app never parses the save file; it's a dumb, reliable pipe. Civ 4 already bakes the turn number and per-player passwords into the save, which is exactly what PBEM needs.

## Status

Works today for **2-player** games. Multi-player (3+) needs a game roster + seat-order rotation — see *Roadmap*.

## Running it

```bash
cd civbuddy
python -m venv .venv && . .venv/bin/activate
pip install -e .

# create players
civbuddy-create-user

# serve (binds 0.0.0.0:8000; access is gated to tailnet/LAN/loopback)
python -m uvicorn civbuddy.main:app --host 0.0.0.0 --port 8000
```

Or install the included systemd user unit:

```bash
cp civbuddy.service ~/.config/systemd/user/
systemctl --user enable --now civbuddy
```

Access is restricted by `middleware/tailscale.py` to `100.*` (Tailscale), `10.*` / `192.168.*` (LAN), and loopback. Everything else gets a 403.

### Exposing it publicly (Tailscale Funnel)

Tailscale Funnel forwards the visitor's **real public IP**, which the tailnet
allow-list rejects. To intentionally serve over a public Funnel, set
`CIVBUDDY_ALLOW_FUNNEL=1` in the environment — this disables the IP gate so
public visitors reach the login. Leave it unset for tailnet-only (the safe
default).

> ⚠️ With the gate open, the app's home-grown session auth is your only
> protection on the public internet. Don't leave a Funnel up long-term.

## Roadmap

- **Multi-player rotation** — `game_players(game_id, user_id, seat_order)` table + next-seat rotation, replacing the current "the other player" shortcut.
- Turn-timer nudges for the player who's holding things up.
- "Download latest save" one-click.
- Optional support for Civ 4's simultaneous-turns mode.

## Sounds (bring your own)

No audio files ship with this repo. The dial-up / IM / "you've got mail"
effects are AOL and Microsoft intellectual property and aren't licensed for
redistribution, so committing them would mean publishing someone else's
copyrighted work. CivBuddy loads sounds from `static/sounds/` at runtime
instead — drop your own files in (the app runs silently if they're missing).
See [`static/sounds/README.md`](static/sounds/README.md) for the exact
filenames and where to source them legally.

## Contributing

Contributions welcome — fork it, add to it, send a PR. By contributing you
agree your changes ship under the project's license (below). Please keep the
existing copyright notices intact.

## License

[GNU GPL v3.0](LICENSE). You're free to use, modify, and distribute CivBuddy,
including commercially — but any distributed version (including forks and
derivatives) must also be released under the GPL with source available, and
must preserve attribution. In short: build on it freely, keep it open, and
credit the source.

© 2026 Tim Allen (Helo3301).

## Notes

- `data/` (SQLite DB with password hashes, sessions, chat, and uploaded saves) is gitignored — it's runtime state, not source.
- Tech: FastAPI · aiosqlite · vanilla JS front-end · WebSockets.
