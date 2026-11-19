# Asteroid Hop

Asteroid Hop is a space-themed endless platformer built with [Phaser 3](https://phaser.io/) and JavaScript. Guide your pilot across moving asteroids, collect coins, avoid patrolling aliens, and reach level checkpoints.

## Features

- Procedurally generated asteroid platforming course
- Horizontal and vertical moving platforms
- Three lives per run
- Eight increasingly difficult levels
- Alien enemies that patrol platforms
- Coin collection and a character shop
- Eight selectable pilots
- Local high score and saved unlocks
- Online world leaderboard through Supabase
- Keyboard, touch, and on-screen controls
- Adjustable music and sound effects

## Controls

| Action | Keyboard | Touch |
| --- | --- | --- |
| Move left | Left arrow | Left button |
| Move right | Right arrow | Right button |
| Jump | Up arrow or Space | Jump button |
| Start / retry | Enter | Start / retry button |
| Pause / resume | P | Pause / resume button |
| Toggle music | M | Music button |
| Toggle sound | Mute button | Mute button |

You can also enter a pilot name from the start screen. Names may contain letters, numbers, spaces, and hyphens, with a maximum length of 20 characters.

## Run locally

The game needs to be served over HTTP rather than opened directly with `file://`.

From the project directory, run:

```powershell
python -m http.server 8000
```

Then open <http://localhost:8000/Index.html> in a browser.

An internet connection is required for the Phaser CDN dependency and the online leaderboard.

## Files

- `Index.html` - Browser entry point and Phaser loading
- `game.js` - Game logic, rendering, input, shop, audio, and leaderboard
- `leaderboard.sql` - Supabase table, permissions, and leaderboard policies

## Leaderboard setup

The project includes a Supabase integration in `game.js`.

To use the included leaderboard SQL:

1. Create a Supabase project.
2. Open the SQL editor.
3. Run `leaderboard.sql`.
4. Replace `SUPABASE_REST_URL` and `SUPABASE_ANON_KEY` in `game.js` with your project values.

The SQL creates an `asteroid_scores` table, validates player names and scores, enables anonymous read/insert access, and adds a leaderboard index. The game submits a score only after a run ends and at least one asteroid landing is scored.

## Saved data

The browser stores the high score, pilot name, coin balance, unlocked characters, and selected character with `localStorage`. Clear site data in the browser to reset progress.
