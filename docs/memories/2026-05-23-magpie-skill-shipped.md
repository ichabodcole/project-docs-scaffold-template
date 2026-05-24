# Magpie skill shipped — Gemini-bbox moodboard extraction

**Date:** 2026-05-23

Built and shipped `toolbox:magpie` — a skill that extracts every distinct visual
element from a moodboard / branding board / sticker sheet as its own PNG, with
conditional `rembg` based on element type. Uses Gemini 3.5 Flash via OpenRouter
for discovery (returns name + type + normalized bbox per element); cost ~1–3¢
per board.

Path traveled: Claude direct-bbox failed (0/5), marker-mode worked but required
user drawing, grid overlay (clever Cole idea, 5/5 in correct cell), Gemini
direct (5/5 pixel-tight, 19/19 in auto-discovery). Gemini wins on every axis so
the v1 ships Gemini-direct; marker-mode and grid stay as artifacts for future
fallback modes.

`type` field Gemini returns drives bg-removal routing —
illustration/sticker/icon/wordmark get alpha, palette/screenshot/typography stay
whole because rembg destroys flat-color content.

**Key files:** `plugins/toolbox/skills/magpie/SKILL.md`,
`plugins/toolbox/skills/magpie/scripts/discover.py`,
`plugins/toolbox/skills/magpie/scripts/extract.py`

**Docs:** [Project folder](../projects/moodboard-element-extraction/) —
investigation, three PoC findings docs, and the 2026-05-23 session walkthrough.
