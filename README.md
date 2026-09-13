# Val2026 live + replay

A Swedish election-night dashboard with live national results, party comparisons and persistent historical playback. Node.js 22+; no runtime dependencies.

```sh
npm start
# Open http://localhost:3000
npm test
```

The server fetches https://resultat.val.se/data/resultat/val2026/RD_P.json every 30 seconds, even without an open browser. A shared 15-second cache coalesces browser requests. Source failures retain the last successful live response with a warning. The browser pauses polling in hidden tabs and refreshes on return.

## Recording and replay

Every changed full source response is written atomically to `data/history/`. Records include capture time, the source's update time, counted districts, party votes and percentages, and invalid votes. Corrections at the same district count are preserved. All 29 constituency summaries and every other field in the root response are retained. Earlier national-only recordings remain readable, with regional data explicitly unavailable. The in-memory index retains compact trend data; full snapshots load from disk on demand. Timestamps alone do not create duplicate records.

The replay slider moves through actual saved snapshots in capture order. Play/pause, previous/next, speed (1× = one snapshot every two seconds), and return to live are available. Live recording continues during playback. Files survive restarts and are loaded automatically. `GET /api/history` returns the timeline; `GET /api/history/:id` returns a snapshot. `GET /api/trends?area=Stockholms%20kommun` returns regional vote-share history, with null values for missing regional snapshots; omit `area` for national trends.

**Keep this Node process running throughout election night and retain the history directory.** Set `HISTORY_DIR` to an absolute path on a persistent disk when deploying, and `PORT` to override 3000. Run one recording process per history directory. A sleeping host or an ephemeral/serverless filesystem will leave gaps or lose history. Back up the directory to preserve the archive.

The feed is a current snapshot, not historical data. Recording started at the first retrieved result (22 districts); districts 1–21 cannot be reconstructed from it. Polling may jump over intermediate district counts. The UI explicitly identifies the first recorded district count and does not interpolate or fabricate results. To capture from the first district in a future count, start the recorder before results begin. Playback follows real observations toward the source's total (currently 6,626), including any corrections to that total.

This is an independent presentation, not an official Valmyndigheten website. Early counts are not a forecast; turnout describes counted districts. The 4% chart marker is the national threshold, not a seat projection.

The only external frontend resource is Google Fonts; system sans-serif fallbacks work offline. Data fetching is server-side to avoid browser CORS restrictions.

## Explore results

- Select a constituency, select multiple parties, search party names, and filter shares above/below 4%.
- Compare against 2022 or the national result from the same snapshot; reveal previous vote totals in the expanded table.
- Expand a party row to see its individual night-long history, first/latest vote share, and change since recording began. Scrub or click the chart and use “Visa denna tidpunkt” to replay that observation; multiple rows can stay open.
- Replay and trend charts preserve the selected area. Clicking a trend observation jumps to that saved snapshot.
- Browse/search/rank all 29 constituencies by leader or a chosen party.
- The constituency browser now fetches the 29 official constituency feeds directly. It shows each region’s own counted-district coverage, valid vote total, leading party and published turnout when available; national zero-filled summaries are not used as regional progress.
- Left block: S + V + MP + C. Right block: M + KD + SD + L. Shares use exact vote counts divided by all valid votes, with other parties shown separately. Block cards follow area and time, independently of party filters. They are not seat predictions.
- The mandate section also identifies the party with the strongest quotient for the next mandate and the party with the weakest quotient for its current last mandate. This is a Sainte-Laguë margin indicator, not a forecast of the final result.
- Download the filtered table as CSV or the full snapshot as JSON. Share-view copies the URL including area, party filters, comparison and selected replay snapshot.
- Regional zero-filled counting metadata is displayed as unavailable. Regional votes and invalid votes are retained as published.

## Temporary public sharing

With the app running on port 3000, run `cloudflared tunnel --url http://localhost:3000` in a second terminal and share its `trycloudflare.com` URL. Keep the app, tunnel and computer running. This publishes the dashboard and its read-only election archive. For a stable deployment, run Node on an always-on host with persistent storage for `HISTORY_DIR`.

## Election-night story

“What changed?” compares the selected observation with the previous saved observation, or with the last observation seen on a previous visit (stored in this browser). National district changes remain labelled national when an area is selected. Vote changes include invalid votes; party changes use published shares.

The block-gap chart uses exact vote totals to calculate left minus right in percentage points. Select a point to replay it. Missing regional history breaks the line instead of being interpolated.

Milestones identify district thresholds first crossed in the recording, block lead changes, and national crossings of 4% using exact vote counts. Corrections do not duplicate district milestones. The first observation never fabricates earlier threshold crossings. Events are observations between snapshots, not exact event timestamps or seat predictions. In replay, the event list and changes summary stop at the selected observation; the block chart shows the full recording with a replay marker.
