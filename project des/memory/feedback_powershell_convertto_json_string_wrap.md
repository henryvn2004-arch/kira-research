---
name: powershell-convertto-json-string-wrap
description: "PowerShell 5.1 ConvertTo-Json silently wraps long strings inside {\"value\":\"...\"} — breaks any API body that expects a plain string field"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: dbedaa56-552b-466a-8744-d591a59653f7
---

**Rule:** Don't use `ConvertTo-Json` in Windows PowerShell 5.1 (powershell.exe) to build a JSON body where a field value is a "long" string (loosely >~1 KB, threshold is murky). Use Node, `Invoke-RestMethod`'s implicit serializer is also affected, or build the JSON manually.

**Why:** PS 5.1's serializer wraps long strings into `{"value":"...the string..."}` even when the original is a plain string. Discovered while POSTing 66 KB HTML to `/api/render-pdf` for the KIRA batch system — Vercel function returned 400 (`Missing required field: html (string)`) because `req.body.html` was a wrapper object, not the string. Even piping a single string into `ConvertTo-Json` produces the wrapped form. Setting `-Depth` does NOT fix it; the wrap happens before depth limits apply.

**How to apply:**
- For any API call where a JSON field carries a long string (HTML, log dump, prompt, etc.), use **Node** instead:
  ```bash
  node --input-type=module -e 'const body = JSON.stringify({ html, filename }); ...'
  ```
- The KIRA batch system uses `skills/kira-research-report/scripts/render-one.mjs` as a reusable helper for the render-pdf call — copy that pattern when you need a quick "POST a big JSON body" script on Windows.
- If you must stay in PowerShell, build the JSON string manually with concatenation + a small escape helper. Do NOT trust `ConvertTo-Json` for the string field.
- This is a Windows PowerShell 5.1 (powershell.exe) quirk specifically — PowerShell 7+ (pwsh.exe) does not have this issue. Henry's machine ships 5.1 by default.

Related: [[project_batch_cron_system]] (the system that hit this), [[reference_kira_research]] (project that uses /api/render-pdf).
