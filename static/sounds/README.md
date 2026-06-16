# Sounds — bring your own

**No audio files are committed to this repository, on purpose.**

The classic dial-up, "door open/slam," IM send/receive, and "you've got mail"
effects that make CivBuddy feel right are the intellectual property of AOL
(now owned by Yahoo Inc. / Apollo Global Management) and Microsoft. Those
sounds are *not* freely licensed for redistribution. Shipping them inside a
public repo would be distributing someone else's copyrighted work — so we
don't, even though the app is built to use them.

Instead, CivBuddy loads sound files from this directory at runtime. Drop your
own copies in here and they'll play; leave it empty and the app runs silently
(playback is wrapped in a `.catch()`, so missing files never break anything).

## Files the app looks for

The front-end (`static/app.html`, `static/index.html`) references these exact
paths under `/sounds/`:

| Filename       | Played when                          |
| -------------- | ------------------------------------ |
| `dialup.mp3`   | Login / "connecting" screen          |
| `dooropen.wav` | A buddy comes online                 |
| `doorslam.wav` | A buddy goes offline                 |
| `imrcv.wav`    | You receive a chat message           |
| `imsend.wav`   | You send a chat message              |
| `newmail.wav`  | It becomes your turn (save uploaded) |

## Where to get them legally

- **Rip from software you own.** If you have an AOL/Windows install (or a disc),
  the original effects are yours to use locally.
- **Use freely-licensed sound-alikes.** Sites like [freesound.org](https://freesound.org)
  have CC0 / public-domain modem, chime, and notification sounds. Search
  "dial up modem", "notification chime", "door close".
- **Record your own.** A quick chime or click works fine.

Match the filenames above and you're done. These files are gitignored, so your
local copies will never be accidentally committed.
