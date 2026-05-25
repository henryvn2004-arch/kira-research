---
name: kira-queue-topic-strategy
description: "Queue replenishment strategy for report_queue.csv — target JP/KR/SG enterprise buyer interest (own market + SEA expansion targets + AU resource supply chain). Last replenished 2026-05-25 to 99 pending (~16 days runway at Q.3 6 reports/day)."
metadata:
  node_type: memory
  type: project
---

## Decision framework

Buyer targeting drives topic selection. Henry's confirmed target users (2026-05-25):
- **Japan** enterprise — research own market + identify SEA expansion targets
- **Korea** enterprise — research own market + identify SEA expansion targets
- **Singapore** enterprise (regional HQs / family offices) — manage SEA portfolio + invest cross-region
- **Australia** added 2026-05-25 — outbound mining/agri/edu exporters into Asia + inbound from JP/KR

This means **avoid generic SEA market reports**. Each new topic should answer at least one of:
1. "JP/KR/SG company researching own home market" → JP eldercare, KR HBM, SG family office
2. "JP/KR/SG company researching where to deploy capital into SEA" → VN auto parts (JP OEM tier-2), ID nickel (KR battery), TH HEV (JP defense vs CN EV)
3. "AU exporter sizing Asian demand" → AU lithium → KR battery, AU agri → JP/KR food, AU edu → SEA students
4. "Cross-region supply chain story" → KR battery cell ← ID nickel + AU lithium

## Industry buckets that JP/KR/SG buyers actually pay for

**JP enterprise priorities** (Tokyo HQ research budgets):
- Automotive (Tier-2 supplier expansion, HEV defense vs Chinese EV)
- Banking M&A (strategic stakes in SEA banks)
- Industrial real estate / FDI parks
- Data center landing partners
- Halal certification (Indonesia, Malaysia)
- Eldercare + medical devices (own aging market)
- Anime IP / sake / premium F&B export
- Semicon materials (photoresist, EUV)
- SME M&A succession deals

**KR enterprise priorities** (Seoul HQ):
- Battery/EV value chain (Indonesia nickel, Australia lithium offtake)
- Textile/garment relocation (China → Vietnam)
- K-cosmetics distribution channels (halal Indonesia, premium JP)
- K-content streaming/licensing economics
- Defense export (K9 howitzer, K2 tank, SEA + Middle East pipeline)
- Shipbuilding (LNG carriers, offshore wind installation)
- HBM semicon (SK/Samsung capacity)
- F&B chain export (chicken, ramen, snacks)

**SG enterprise priorities** (regional HQ / family office):
- Family office structuring (VCC adoption, JP/KR HNW inflows)
- Data center capacity overflow → Johor/Batam
- Private credit / regional non-bank lending
- Green finance + ASEAN taxonomy
- Cross-border payment infrastructure
- Wealth management (portfolio across SEA)

**AU exporter priorities**:
- Mining services + lithium refining + Korean battery offtake
- Agribusiness export to JP/KR (beef, grain, wine)
- Education export (SEA student inflows, offshore campus)
- Superannuation funds allocating to SEA infrastructure

## Avoid (generic / weak buyer signal)

- Pure consumer market sizing without channel/distribution angle
- Reports without a "who would pay $39 for this?" answer
- Industries dominated by Chinese capital with no JP/KR/SG plays (e.g., bare-metal commodity steel)
- Western-facing topics with no Asian buyer relevance

## Current queue state (post-2026-05-25 replenishment)

- **99 pending** across 9 countries (VN/ID/TH/MY/PH/SG/JP/KR/AU)
- ~16 days runway at Phase Q.3 throughput (6 reports/day published)
- Year mix: ~60% 2026, ~40% 2027 outlook
- Next replenishment due **~2026-06-10** (when pending drops below ~40)

Distribution after 2026-05-25 top-up:
| Country | Pending | Notes |
|---|---|---|
| VN | 15 | broadest coverage; JP auto/banking/IRE + KR textile heavy |
| ID | 14 | nickel-battery story arc; halal beauty/auto-defense |
| TH | 12 | HEV defense + medical hub + petrochem |
| JP own | 11 | M&A succession, eldercare, defense, semicon materials |
| MY | 10 | Johor data center + halal export + RE |
| PH | 10 | mining + offshore wind + JP food mfg |
| SG | 10 | family office + post-moratorium data center + green finance |
| KR own | 10 | defense, shipbuilding, HBM, chicken export |
| AU | 7 | NEW 2026-05-25 — mining/lithium/agri/edu/super |

## How to add topics (mechanics)

1. Edit `data/report_queue.csv` directly. Append rows below existing pending rows.
2. Columns: `id,topic,country,industry,year,target_languages,status,output_paths,date_added,date_completed,error_log`
3. ID convention: `<year>-<cc>-<slug>` (e.g., `2026-vn-automotive-parts`). Use `-2` suffix if slug collides.
4. Topic field: ≤100 chars, quoted because of commas. Format: `"<Country> <industry> <year>: <angle1> and <angle2>"`.
5. `target_languages` always `"en,ja,ko"` (Phase 8/9 trilingual).
6. `status` = `pending`, leave `output_paths`/`date_completed`/`error_log` empty.
7. `date_added` = today's date YYYY-MM-DD.
8. Commit message: `queue: +N topics <theme>` — push to main, cron picks up next fire.

## Bash heredoc gotcha (2026-05-25)

When appending many CSV rows on Windows Git Bash, `cat >> file << 'EOF' ... EOF` failed with "unexpected EOF looking for matching `''`" — likely a tool harness parser issue with the single-quoted EOF delimiter. **Workaround:** write rows to a temp file via Write tool, then concat via Node:
```
node -e "const fs=require('fs');const m=fs.readFileSync(p,'utf8');const a=fs.readFileSync(t,'utf8');fs.writeFileSync(p,m+(m.endsWith('\n')?'':'\n')+a);"
```
This handles trailing-newline preservation cleanly and avoids BOM issues that PowerShell 5.1's Add-Content adds with `-Encoding utf8`.

See also: [[project_batch_cron_system]] · [[project_tool_gen_report]]
