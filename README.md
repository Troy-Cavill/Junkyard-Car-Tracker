# Pickapart Vehicle Tracker

This Chrome extension watches listings on pickapart.co.nz and stores each vehicle's first-seen timestamp in browser localStorage, grouped by location.

## Features
- Ignores header links such as `<a><b>BMW</b></a>`
- Tracks vehicle listings by location so different sites do not interfere with each other
- Highlights rows green when their age falls within the selected day range
- Provides minimum and maximum day sliders for the highlight range
- Persists the first-seen timestamp in localStorage for later refreshes
- Stores grouped listings by title with their vehicle count separately
- Resets a grouped listing's first-seen date when its count increases, but not when it decreases

## Load the extension in Chrome
1. Open `chrome://extensions`
2. Enable Developer mode
3. Click "Load unpacked"
4. Select this folder

## Notes
- The extension targets pages matching `https://pickapart.co.nz/*`
- Storage is grouped on the current page path, for example `pickapart.co.nz/Mangere-Stock`
- Highlight range settings are saved in localStorage and persist across page reloads
- Grouped entries use a fresh format such as `title:Toyota Corolla`: `{ "firstSeen": timestamp, "count": 3 }`
- Clear existing tracker localStorage entries before using this format; old grouped entries are not migrated
