# CAPTCHA Gym — Build Specification

**Version:** 0.1 (2026-10-10)
**Status:** Build-ready. Every parameter below is tagged **[Documented]** (Google's own docs / observed production behaviour), **[Research]** (peer-reviewed or reproducible-solver evidence), or **[Design choice]** (invented for this gym — a starting point to calibrate, *not* a claim about Google).

**Evidence base:**
- Deep-research report: `~/workspace/research_notes/recaptcha-agent-training-research-20261010-1611/report.md` (esp. §6).
- Perplexity run #1 (Search mode, 45 sources) and Perplexity verification pass (Part 1 claim verdicts + Part 2 open-ended additions), 2026-10-10.
- **Where the verification pass conflicts with the original report, the verification pass wins.** Applied corrections:
  - The 2024 ablation study is **Plesner, Vontobel & Wattenhofer, ETH Zurich (COMPSAC 2024)** — *not* UC Irvine. (The ~18 s human figure is a *different* study: Searles et al., UC Irvine 2023.)
  - **Bézier curves show no significant advantage over straight paths.** Pointer *movement itself* (vs. none) is what reduced challenge load. Therefore this gym scores pointer behaviour at the level of *event order, coordinate plausibility, and temporal plausibility* — never fine trajectory-shape classification.
  - **Human timing is a context-dependent range, not a constant** (checkbox ≈1.85 s and image challenges ≈10–10.6 s in an NDSS 2025 study of 3,600+ users; ≈18 s / 22 s contextualised in the UC Irvine study; successful solvers ≈14–19 s per challenge). The gym uses **bands**, never a single target number.
  - The **partial-object rule is a solver-side annotation contract, not a Google rule** (Google publishes none). The gym stipulates it explicitly (§4) with a small overlap threshold and a two-label ambiguity band.

---

## 1. Purpose & non-goals

### Purpose
A private, self-hosted training and evaluation harness ("the gym") that lets *our own* browser-worker agents practise reCAPTCHA-v2-*style* challenges — checkbox gate, image grids, dynamic replacement grids, sliced-photo grids — against known ground truth, with a mock risk scorer and full instrumentation. Goals:

1. **Measure** agent performance honestly: per-challenge and per-session pass rates, per-tile perception quality, procedure-error rates, and behavioural plausibility — the three levels in §7.
2. **Train procedure and calibration**: the skills that transfer — any-part-counts tile selection, dynamic-mode re-scan discipline, Skip-vs-Verify correctness, human-band pacing, pointer movement that exists and is plausible.
3. **Regression-test agent stacks**: when the worker's model, brief, or input channel changes, re-run the gym and see which metric moved.

### Non-goals (hard boundaries)
- **NOT a replica of Google's risk engine.** Google's model is proprietary, trained on planetary-scale data, and continuously retrained. The gym's scorer is an interpretable caricature (§6). Mastering the gym is a *necessary, not sufficient* predictor of production performance.
- **NOT a CAPTCHA-solving service or bypass tool.** The gym mints only its own local tokens (§3.4), which are meaningless outside the gym. Nothing here interoperates with real reCAPTCHA: no Google JS, no sitekeys, no token injection into third-party sites.
- **NOT for use against third-party sites.** It exists to train/evaluate our agents for challenges they encounter inside tasks the user requested. It is not to be pointed at, or used to farm, production challenges.
- **No real reCAPTCHA code, assets, branding, or keys.** All UI is original, "v2-style" in interaction grammar only. Do not copy Google's widget artwork, wording beyond generic instruction phrases, or class icons.
- **No persistent cross-site identity simulation beyond the gym itself.** The gym simulates *a* profile history (§6), never *the* Google cookie graph.

### Honest fidelity limits (state these in the gym's own UI/README too)
1. The mock scorer's weights are design choices; Google's are unpublished.
2. The challenge corpus is finite and self-made; production draws on a vast, shifting corpus with deliberately ambiguous items.
3. IP/account reputation at Google's scale cannot be simulated; the gym stubs reputation as a synthetic feature.
4. The gym is frozen at build time; production is a moving target. Version the gym and re-calibrate against fresh published studies periodically.

---

## 2. Architecture

### 2.1 Shape
A single self-contained web app with two parts, **zero third-party dependencies**:

| Part | Tech | Contents |
|---|---|---|
| Front end | Static HTML/CSS/vanilla JS, no build step, no CDN, no external fonts | Checkbox widget, challenge popover (Type A static, Type A dynamic, Type B), result/cooldown screens, optional spectator view (§2.5) |
| Server | Node 20+ **standard library only** (`node:http`, `node:fs`, `node:crypto`) — one file, `server.js` | Session state, challenge generation from seeds, **all scoring server-side**, token mint/verify, mock risk scorer, attempt logging, metrics API, static file + image serving |

Rationale: one language, no `npm install`, no supply chain, runs anywhere Node runs. All state in memory plus an append-only JSONL log on disk (no database in v1).

### 2.2 How agents reach it
- Server binds `0.0.0.0:8931` **[Design choice]** on the VM; agents load `http://<vm-lan-ip>:8931/` in the managed Chromium browser.
- The gym must be reachable from the browser-worker environment. **Acceptance step (§9):** before anything else is signed off, a real browser-worker task loads the page and completes a checkbox-only session. If the worker sandbox cannot reach the VM's LAN address, fall back to whatever address the browser itself runs on (e.g. the host gateway IP) — discover this during acceptance, do not assume `localhost` works.
- No TLS (local network only), no auth in v1 (local network only). **Do not expose this port to the public internet.**

### 2.3 Trust boundary (load-bearing)
The agent under test is an adversary of the scoring system for integrity purposes: **ground truth must be unrecoverable from anything the client can see** (§8.2). Therefore:
- The client receives only: opaque tile IDs, image bytes (via opaque URLs), the instruction text (target class name — this *is* shown to humans in production, so it is fine), and UI state transitions.
- The client **never** receives: masks, labels, overlap fractions, the seed's solution set, the risk score, or feature values.
- All pass/fail decisions are computed on the server from the client's submitted tile-ID selections and event trace.

### 2.4 API surface (JSON over HTTP; all under `/api/`)
| Endpoint | Method | Purpose |
|---|---|---|
| `/api/session` | POST | Create a session. Body (optional): `{profile_id, scenario}`. Returns `{session_id, state}`. Server sets a gym cookie for profile continuity (§6.2). |
| `/api/session/:id/checkbox` | POST | Checkbox click. Body: `{event_trace}` (§6.4). Returns `{outcome: "pass"\|"challenge", token? , challenge?}`. |
| `/api/session/:id/verify` | POST | Submit a challenge attempt. Body: `{challenge_id, selected_tile_ids, event_trace, client_grid_state}`. Returns `{result: "pass"\|"retry"\|"fail_round", new_challenge?, token?}`. Never returns *which* tiles were wrong (production doesn't either). |
| `/api/session/:id/skip` | POST | Skip action for static Type A (valid only when offered). |
| `/api/session/:id/token/verify` | POST | Host-site-style token check: `{token}` → `{valid, reason}` (single-use, expiry — §3.4). |
| `/api/admin/runs` | GET | List attempt logs (for report generation; not linked from the agent-facing UI). |
| `/api/admin/metrics?run=<id>` | GET | Aggregated metrics per §7 for a run or all runs. |
| `/api/admin/reset` | POST | Clear in-memory sessions (logs persist). |

`scenario` is a test-harness control (set by *us*, via a query param the agent isn't told about, e.g. the session-creation call is made by the test driver, not the agent): one of `natural` (scorer decides everything), `force_static`, `force_dynamic`, `force_type_b`, `force_low_trust` (start trust at 20), `force_high_trust` (start trust at 90). This is how specific skills get exercised on demand instead of waiting for the ladder to serve them.

### 2.5 Pages
- `/` — a plain mock "host page" ("This page is protected by CAPTCHA Gym" + the checkbox widget), deliberately boring: the gym is a component on a page, like production.
- `/results` — spectator/report page (for Ben and us, not part of agent tasks): recent sessions, pass rates, links to attempt detail (screenshot, event trace replay summary, score explanation). Server-rendered from the logs; no framework.

### 2.6 Directory layout
```
captcha-gym/
  SPEC.md            (this file)
  server.js          (the whole server)
  public/            (front end: index.html, results.html, app.js, style.css)
  corpus/
    typeA/           (tile photos + manifest.jsonl)
    typeB/           (scene photos + masks + manifest.jsonl)
  data/
    attempts.jsonl   (append-only attempt log)
    sessions.jsonl
  tools/
    build_corpus.*   (offline corpus builders/annotators)
    report.js        (baseline report generator, §9)
```

---

## 3. Challenge types & session state machines

Build order is §9's; this section specifies all of them.

### 3.1 Session lifecycle (state machine)
```
INIT ──checkbox──▶ SCORED ──trust ≥ pass band──▶ PASSED (token minted)
                     │
                     └──trust < pass band──▶ CHALLENGED(round 1)
CHALLENGED ──verify: exact pass──▶ PASSED (token minted)
           ──verify: fail──▶ trust -= delta ──▶ CHALLENGED(round n+1)   [new challenge]
           ──rounds > max_rounds OR trust < floor──▶ COOLDOWN (rate-limit state, §3.6)
           ──challenge clock expires──▶ EXPIRED ──▶ INIT (must re-click checkbox)
PASSED ──token presented after expiry or twice──▶ token verify fails (state stays PASSED; token dead)
COOLDOWN ──cooldown timer ends──▶ INIT
```
- `max_rounds` default **6** **[Design choice]**, mirroring the research observation that sessions are forgiving but not infinite, and that repeated failure escalates to a block state rather than endless rounds.
- Every transition is logged with the scorer's explanation (§6.5).

### 3.2 (a) Checkbox gate + mock token
Interaction grammar **[Documented]**: unchecked box → click → spinner (300–1200 ms, randomised **[Design choice]**) → green tick (pass) or challenge popover.
- On pass, server mints a token: opaque random string (≥128 bits), stored server-side with `{session_id, minted_at, used:false}`.
- **Token clock [Documented]: single-use, 120 s expiry** — model exactly: second use → invalid; use after 120 s → invalid.
- **Challenge clock is a SEPARATE clock [Design choice, modelled on production expiry behaviour]:** each served challenge has its own `challenge_expires_at` = served_at + **180 s [Design choice]**. If it lapses mid-attempt, Verify returns `challenge_expired`, the round is consumed, trust takes the failure delta, and the agent must start again from the checkbox (production's "verification expired, check the checkbox again" behaviour). Token expiry and challenge expiry must be independently testable — the metrics (§7C) count them separately.
- The checkbox click itself is a scored event: the event trace up to the click feeds the first scorer evaluation (§6).

### 3.3 (b) Type A 3×3 static — independent images
- Grid: 3×3, nine **independent** tile photos (semantically separate images; production serves them as a sprite — the gym may serve individual files; visual result identical) **[Research: taxonomy]**.
- Instruction: "Select all images with **{class}**. If there are none, click **Skip**." **[Documented wording pattern]**
- Target count per grid: 0–5, drawn from the corpus difficulty distribution (§5.4); **0-target grids must occur** (they test Skip discipline).
- Buttons: **Verify** (enabled when ≥1 tile selected), **Skip** (always available). Verify with 0 selected is a **procedure error** (production's correct move is Skip); log it as such rather than a perception error.
- Scoring: exact set match in Strict mode; Lenient mode (site security preference, §4.4) forgives exactly one tile error **[Research: Hossen near-miss probing — default ≈ exact-match; one-error forgiveness only at "Easiest"]**.
- Round ends on Verify (pass/fail) — no per-tile feedback.

### 3.4 (c) Type A 3×3 dynamic — fade-and-replace
Instruction: "Select all images with **{class}**. Click **Verify** once there are none left." **[Documented wording pattern]**

Tile state machine (per tile):
```
UNSELECTED ──click──▶ SELECTED
SELECTED(correct) ──server confirms──▶ FADING (400–700 ms [Design choice]) ──▶ REPLACING (new image fades in, 300–600 ms) ──▶ UNSELECTED (settled)
SELECTED(incorrect) ──▶ stays SELECTED, no replacement   [Research: incorrect clicks are not replaced]
any state ──grid re-render──▶ (agent's view may be stale — see failure modes)
```
Rules:
- On each click of an unselected tile, the client sends the click; the server (ground truth holder) decides if the tile is a target. Target tiles are queued for replacement; non-targets stay selected.
- **Replacements are drawn from the tile pool with probability p(target) ≈ 0.35 [Design choice]** — replacements may themselves be targets, so the total click count is unbounded in principle; the round ends only when the *settled* grid contains zero targets.
- **Verify is valid only on a settled grid with zero targets.** "Settled" = no tile in FADING/REPLACING state *and* the client's final grid state (tile IDs) matches the server's current grid state.
- **Failure mode 1 — verify-too-early:** Verify while any replacement is pending/in-flight → round fail, procedure error `verify_unsettled`. Also: Verify when the settled grid still contains a target the agent never clicked → round fail split by cause: if the target arrived as a replacement *after* the agent's last full-grid observation, log `late_replacement_missed`; else perception FN.
- **Failure mode 2 — stale tile:** a click referencing a tile ID that has already been replaced (agent acting on a pre-fade screenshot/coordinate map) → server rejects with `stale_tile`, logged as procedure error `stale_tile_click`, does **not** count as a wrong selection. Two or more stale clicks in a round also feed the risk scorer's in-challenge behaviour feature (§6.3).
- The client UI must faithfully render fades (opacity transition, tile unclickable while FADING/REPLACING) — agents must learn to *wait and re-scan*, which is the skill being trained.
- There is **no Skip** in dynamic mode; an initially target-free dynamic grid is passed by clicking Verify immediately (rare; include at low rate so agents learn it).

### 3.5 (d) Type B 4×4 sliced photo — v1.1
- One scene photo sliced into a 4×4 grid of 16 tiles. Instruction: "Select all squares with **{class}**." Single pass, Verify only (no Skip; production serves Type B only when targets exist) **[Research: taxonomy]**.
- Ground truth from the scene's segmentation mask for the target class (§4.1) — never from bounding boxes at runtime; masks are precomputed at corpus build time.
- The whole scene is served as one image with CSS slicing (or 16 crops of the same scene — visually identical); tile IDs are per-position opaques.
- Scoring identical to Type A static (Strict default).

### 3.6 (e) Escalation ladder & cooldown
Driven by the mock risk score (§6) plus round outcomes:

| Entry trust band | Served experience |
|---|---|
| ≥ 75 | Checkbox pass (NoCAPTCHA) |
| 55–74 | One Type A static round (Strict; Lenient if site preference = Easiest) |
| 35–54 | Type A dynamic, or 2 static rounds; Strict |
| 20–34 | Dynamic + additional rounds (up to `max_rounds`); Strict |
| < 20, or rounds exhausted, or failure burst | **COOLDOWN**: explicit rate-limit screen ("Too many attempts. Try again in Ns."), N = 60 s **[Design choice]**, session locked until it elapses |

- **Cooldown replaces endless escalation** (verification-pass design rule): production punishes with blocks and burned IPs; the gym makes the cost *visible and finite* so agents learn burst behaviour is expensive, without trapping a training run forever.
- **In-session trust feedback [Research: escalation on failure is observed production behaviour]:** pass a round: trust **+4**; fail a round: trust **−7**; procedure error (any §7C type): additional **−2**; stale-tile burst: **−2**. All deltas **[Design choice]**, applied immediately and reflected in what the next round serves.
- Band thresholds are **randomised per session** by ±5 points (seeded, logged) so agents cannot learn exact cut-offs **[Design choice — anti-overfit, from the verification pass]**.

---

## 4. Ground truth & annotation contract

This contract is the gym's constitution. The partial-object policy is **stipulated here** (Google publishes no rule **[Documented absence]**); it follows the solver-proven convention from the research: Plesner et al.'s Type B solver selects any cell overlapping the object's segmentation mask and reached 100% session success; Hossen et al.'s bounding-box-intersection solver is equivalent in effect.

### 4.1 Source of truth: segmentation masks
- **Type B:** every scene ships with a per-class segmentation mask (PNG, single channel, pixel = class id) produced at corpus build time (§5.2). Tile ground truth is *derived*, never hand-entered per tile:
  `overlap(tile, class) = mask_pixels(class ∩ tile) / tile_pixel_area`.
- **Type A:** every tile photo ships with a per-tile label set (classes visibly present) from the corpus manifest (§5.2). "Visibly present" = a human annotator can identify an instance of the class in the image at tile display size.

### 4.2 The positive rule (both types)
A tile is **positive** for class C iff:
- Type B: `overlap(tile, C) ≥ 0.005` (0.5% of tile area) **[Design choice — noise floor]**. The threshold exists *only* to keep 1-pixel annotation noise from deciding pass/fail. It is **not** a fragment-exclusion rule: a tyre sliver, a fragment of traffic-light housing, one wheel arch — all positive if they clear the floor.
- Type A: C ∈ tile's label set.
- **Overlap bands** are recorded for every positive tile for metric slicing (§7B): `whole` ≥ 50%, `partial` 5–50%, `sliver` 0.5–5%.

### 4.3 Stipulated negatives (documented, versioned)
The following are **negative by stipulation** even when visually adjacent to a positive:
- The target object's **shadow** and **reflection**.
- **Attached infrastructure**: poles/posts of traffic lights and street signs are *not* the target, unless the named class is the pole/sign assembly itself. (Production is genuinely ambiguous here — first-person accounts document humans failing on exactly this — so the gym picks the solver-proven convention and says so.)
- Objects of class C visible *inside* another depicted medium (a photo of a bus on a billboard) — negative **[Design choice]**.
Changes to this list require a contract version bump (§4.5) and re-annotation of affected items.

### 4.4 Ambiguity band — two labels, separate accounting
Every tile carries **two** ground-truth labels:
- `strict_visible_overlap` — the §4.2 rule, mechanically applied. **This is the scoring label.**
- `human_ambiguity_band` — `true` if the item falls in the ambiguity band: overlap within 0.5–2% **or** annotator disagreement (§4.5) **or** heavy occlusion / tiny distant instance / stipulated-negative edge case.
Scoring and reporting rules:
- Headline metrics (§7) use `strict_visible_overlap` on **non-band** tiles only.
- Errors on band tiles are counted and reported **separately** as `ambiguity_errors` — never silently folded into perception precision/recall. (Production contains genuinely ambiguous items; conflating annotation ambiguity with agent error corrupts the training signal — research §6.2.)
- Each challenge also records `contains_band_tiles: bool`; per-challenge exact-match is reported with and without band-containing challenges.

### 4.5 Annotation process & agreement
- Type B masks: two independent annotation passes (human or model-assisted with human review); per-tile agreement computed from derived labels. Target: **Cohen's κ ≥ 0.80** on non-band tiles before a scene enters the corpus **[Design choice]**; scenes below target go to adjudication or the band.
- Disagreement does not get averaged away — disagreeing tiles are *put in the ambiguity band*. The band is where disagreement lives, by design.
- The contract (this section) is versioned (`gt_contract: "1.0"`); every attempt log records the version it was scored under. Any change to §4.2–4.3 bumps the version and invalidates cross-version metric comparisons.

### 4.6 Classes & holdout
Class list (16) **[Research: ~13 classes in Plesner et al.; 16 in Salman & Bicakci]**:
`bicycle, bridge, bus, car, chimney, crosswalk, fire_hydrant, motorcycle, mountain, palm_tree, stairs, taxi, traffic_light, tractor, train, boat`
- **Per-class holdout:** `train` and `boat` are **held out of the training corpus entirely** in v1/v1.1 — they appear *only* in the final holdout set (§8.1) as transfer tests (can the agent follow an instruction for a class it never practised?). **[Design choice]**
- Every other class needs both Type A tile presence and (v1.1) Type B scene presence.

### 4.7 Scoring modes
- **Strict** (default): selected set must equal positive set (non-band) exactly. One FP or one FN = round fail. **[Research: Hossen — at default settings, +1 wrong tile passed 0–6%, −1 tile passed 0–2%.]**
- **Lenient**: forgives exactly one tile error (FP or FN). Active only when the mock site's *security preference* = `easiest` **[Research: three site preference levels exist; only "Easiest" was observed forgiving a one-tile error]**. Site preference is a server config: `easiest | balanced (default) | strictest`; `strictest` additionally raises entry-band thresholds by 5. Security preference changes *leniency*, not perception difficulty — Hossen measured negligible accuracy differences across levels (82/78/84%).

---

## 5. Image corpus plan

### 5.1 Sources (in priority order)
1. **Openly licensed photos with existing annotations** — e.g. COCO / Open Images subsets (segmentation masks already exist for Type B; per-image class labels seed Type A). Record the licence per item in the manifest; only use licences permitting this use (CC-BY / public domain). **[Design choice — flag for Ben: see §10, Q1.]**
2. **Synthetic / generated scenes** — rendered or AI-generated street scenes where masks are exact by construction. Preferred for: sliver-band Type B items (place an object so a known fragment crosses a tile boundary), stipulated negatives (shadows, poles), and held-out styles.
3. **Self-shot photos** — phone photos of local streets/objects; masks annotated per §4.5. Highest annotation cost; use sparingly for realism gaps.
- **Never** scrape production reCAPTCHA challenges or use Google's corpus. Never use images whose licence is unclear.

### 5.2 Manifests (the corpus is data + these files)
`corpus/typeA/manifest.jsonl` — one line per tile image:
```json
{"tile_uid":"a_000123","file":"typeA/a_000123.jpg","labels":["car","traffic_light"],
 "source":"open_images","licence":"CC-BY-2.0","split":"train","annotators":2,"kappa":0.87}
```
`corpus/typeB/manifest.jsonl` — one line per scene:
```json
{"scene_uid":"b_000045","file":"typeB/b_000045.jpg","mask":"typeB/b_000045_mask.png",
 "classes_present":["bus","traffic_light","car"],"source":"synthetic",
 "licence":"generated","split":"train","kappa":0.91}
```
Tile-level positives/bands are *derived at build time* by `tools/build_corpus` from masks + §4 rules and cached in `corpus/derived/` — annotators never label tiles directly for Type B.

### 5.3 Difficulty axes (tag every item; metrics slice by them)
`instance_size` (fraction of tile/scene), `occlusion` (none/partial/heavy), `blur` (none/mild/strong), `clutter` (low/med/high), `distance` (near/mid/far). Challenge generation samples across axes; the eval sets (§8) fix the mix so scores are comparable across runs.

### 5.4 Minimum corpus sizes
| Set | v1 (launch) | v1.1 | Notes |
|---|---|---|---|
| Type A tile images | ≥ 60 per class × 14 train classes (**≥ 840**) | ≥ 100/class | Each class also needs ≥ 15% hard negatives (context-only scenes: a road with no vehicle) |
| Type A grids per eval set | 200 static + 200 dynamic (generated from pool by seed) | — | Generated, not stored; seeds make them reproducible |
| Type B scenes (with masks) | — | ≥ 300 total, ≥ 25 scenes containing each train class | Synthetic scenes may carry more of this load |
| Type B sliver-band scenes | — | ≥ 40 scenes engineered so a target fragment of 0.5–5% lands in ≥1 tile | The signature Type B training item |
| Final holdout (§8.1) | 100 Type A challenges + all holdout-class items | + 60 Type B scenes | Untouched until final eval; disjoint scenes *and* disjoint source photos |

All sizes **[Design choice]** — floors for statistical signal (a class with < 25 items can't support a per-class recall figure worth reading), not fidelity claims.

### 5.5 Challenge generation
- A challenge = `{seed, type, class, tile_uids[9|16], positives (server-only), band_flags}` generated deterministically from the seed by the server; the seed is logged (§7) so any attempt is exactly reproducible offline.
- Type A target-count distribution **[Design choice]**: 0 targets 10%, 1: 15%, 2: 25%, 3: 25%, 4: 15%, 5: 10%. Dynamic rounds start from a fresh draw each round.
- Near-duplicate scenes/tiles must not appear in both train and holdout splits (§8.1) — split by *source photo/scene*, never by tile.

---

## 6. Mock risk scorer

### 6.1 Principles
- **Interpretable only.** A weighted sum of named, logged features → 0–100 trust. No ML model, no hidden state. Every score ships with a human-readable explanation (§6.5). If we can't explain a score, the feature doesn't ship.
- **Weights are design choices, not Google's** (Google's are unpublished **[Documented absence]**). Ordering follows the research effect sizes: session/profile continuity and automation markers dominate; pointer behaviour is a *plausibility* signal, not a shape contest (verification-pass correction).
- **Randomised band thresholds** (§3.6) and a rotated probe set (§8.3) exist because an agent that learns *this scorer's* exact weights has learned the scorer, not the skill.

### 6.2 Feature list (v = value 0–1 per feature; score = Σ weight × v, clamped 0–100)
| # | Feature | Wt | How the gym measures it (all client-observable or profile state) |
|---|---|---|---|
| F1 | **Automation fingerprint** | 25 | Hard deductions: `navigator.webdriver === true` (−15), headless UA traits (−8), incoherent `window.chrome`/plugins/WebGL renderer strings (− up to −10). Several are individually near-fatal, mirroring WebDriver outcomes **[Research: Hossen — same detector ≈83% via Puppeteer vs 32%/<40% via WebDriver, blocks]**. |
| F2 | **Profile / session continuity** | 20 | Gym cookie age & prior sessions on this profile; prior *successful* solves (+), prior cooldowns (−); presence of plausible browsing history within the gym's mock host pages (pages visited before the checkbox, dwell across pages). **[Research: cookies/history = strongest single round-count lever — Plesner et al.]** |
| F3 | **Simulated network reputation** | 10 | Synthetic per-profile value assigned at profile creation (seeded): classes `residential_stable / residential_new / vpn_exit / datacenter`. Stub only — the gym cannot know real IP reputation (§1). |
| F4 | **Pointer-event authenticity** | 15 | Plausibility checks ONLY: pointer events exist before the checkbox click (no movement at all is the known-bad case **[Research: ablation 2→13 rounds when mouse removed]**); event order is physically possible (move → down → up, no teleporting *clicks* without preceding moves); coordinates land inside the elements clicked; inter-event intervals are non-degenerate (not all identical, not zero). **Explicitly NOT scored: path curvature/shape** (verification pass: Bézier ≈ straight, no significant difference). Centre-bias: fraction of clicks within the central 10% of tile area is *logged* (§7) but worth at most −2 here. |
| F5 | **Timing plausibility** | 10 | Time-on-page before checkbox; per-challenge decision time vs **bands**: image challenge < 3 s is implausibly fast, 5–30 s is the human/solver band, > 150 s risks the challenge clock **[Research: timing is a context-dependent range — NDSS 2025 ≈10–10.6 s image challenges; UCI ≈18–22 s; solvers 14–19 s]**. Inter-click interval *variance* (uniform metronome timing scores low); no fixed "safe delay" exists and none is encoded **[Research: specific ms recipes = folklore]**. |
| F6 | **Environment coherence** | 10 | UA ↔ platform ↔ screen/timezone/language mutual consistency (e.g. UA claims Windows, fonts/platform say Linux → deduction). |
| F7 | **In-challenge behaviour** | 10 | Event counters present (mouse/key/focus) **[Reported: widget payload includes such counters]**; scroll or page interaction before solving (+ small); dynamic-mode re-scan behaviour (pointer visits tiles changed by replacement before Verify) (+); stale-tile clicks (−); failure burst rate within session (−). |

### 6.3 In-session updates
Applied between rounds (§3.6): round pass +4, round fail −7, procedure error −2 extra, stale burst −2. Trust never exceeds 100 or drops below 0; cooldown triggers per §3.6 regardless of score once rounds are exhausted.

### 6.4 Event trace (client → server, per interaction)
The client records and submits a trace with checkbox clicks and Verify submissions:
```json
{"t": 1234, "type": "pointermove|pointerdown|pointerup|click|keydown|focus|scroll",
 "x": 412, "y": 305, "target": "tile:7|checkbox|verify|skip|other", "tile_id": "opaque-id-or-null"}
```
`t` = ms since session page load (monotonic). The server stores the raw trace in the attempt log (§7.4) and derives F4/F5/F7 features from it. Traces are also how "re-scan after replacement" is detected: a pointermove over a replaced tile's region after its fade completes.

### 6.5 Score explanation (returned in logs, never to the agent mid-session)
```json
{"trust": 61, "band": "static_one_round",
 "features": {"F1_automation": {"v": 0.9, "pts": 22.5, "notes": ["webdriver flag present: -15 applied then normalised"]},
              "F2_profile": {"v": 0.4, "pts": 8.0, "notes": ["cookie age 2d, 1 prior pass"]}},
 "deltas_applied": [{"round": 1, "reason": "round_fail", "delta": -7}],
 "threshold_jitter": {"pass_band": 78, "note": "seeded, session-scoped"}}
```

---

## 7. Instrumentation & metrics

Report **all three levels**. No single number is a result. (Structure per the verification pass.)

### 7.1 Level A — Risk / access
- Checkbox pass rate (NoCAPTCHA share of sessions), split by entry-trust band and by scenario (§2.4).
- Escalation distribution: % sessions served 0 / 1 / 2+ rounds; challenge-type mix served (static vs dynamic share — production comparison point: >25% dynamic under suspicion **[Research: Hossen]**).
- Token validity rate: % minted tokens successfully verified; failure reasons split (expired vs replayed vs unknown).
- Recovery after failure: % of failed-round sessions that eventually pass; median rounds-to-recover; cooldown incidence rate.

### 7.2 Level B — Perception (per-tile, from server ground truth)
- Precision / recall / F1 **per class** and overall, on non-band tiles.
- **FP and FN counts reported separately, always** (production punishes both ≈ equally; an agent trading one for the other must be visible).
- **Exact-board accuracy**: % challenges where selected set == positive set (the per-challenge pass rate), reported alongside session pass rate — the literature's central lesson is that these two numbers diverge wildly (58% per-challenge → 92.6% per-session) **[Research: Robot Visions]**.
- **Partial-tile recall** by overlap band: `whole` / `partial` / **`sliver` (< 5%) reported on its own line** — this is the metric that exposes overly-literal solvers.
- Splits by difficulty axes (§5.3): instance size, occlusion, blur, clutter.
- `ambiguity_errors`: errors on band tiles (§4.4), counted and shown separately, never merged into precision/recall.

### 7.3 Level C — Behaviour / procedure
- **Session pass rate** (headline) and **first-attempt pass rate** (passed with zero failed rounds).
- Static vs dynamic completion rates; dynamic rounds: mean replacements consumed per pass.
- **Procedure-error rates**, each as % of relevant attempts: `verify_too_early` (Verify on unsettled grid), `verify_instead_of_skip` (Verify with 0 selected on a 0-target static grid), `stale_tile_click` count, `challenge_expired` count, `token_expired` count.
- **Decision-time percentiles** (p50/p90) per challenge type, and % of attempts inside the plausible band (§6.2 F5) — reported as distributions, never as pass/fail against a single constant.
- Trust trajectory per session: entry score, per-round deltas, exit band (the §6.5 explanations, aggregated).

### 7.4 Attempt log (append-only JSONL, one line per *round* attempt)
```json
{"attempt_id":"att_01J…","session_id":"ses_…","run_id":"run_2026-10-10_baseline",
 "ts":"2026-10-10T16:40:00Z","gt_contract":"1.0","scenario":"natural",
 "challenge":{"id":"ch_…","type":"typeA_dynamic","class":"motorcycle","seed":881726,
   "tile_ids":["…"],"positives_server_only":["…"],"band_tiles":["…"],
   "overlap_bands":{"tile_x":"sliver"}},
 "agent":{"selected":["…"],"verify_state":"settled|unsettled","grid_state_match":true},
 "outcome":{"result":"pass|fail","fp":0,"fn":1,"fn_bands":["sliver"],
   "procedure_errors":["verify_too_early"],"ambiguity_errors":0},
 "risk":{"trust_before":61,"trust_after":68,"explanation":{…§6.5…}},
 "timing":{"page_to_checkbox_ms":4200,"challenge_ms":13400,"inter_click_ms":[820,1450,610]},
 "event_trace":[…§6.4…],
 "screenshot":"data/shots/att_01J….png"}
```
- `screenshot`: the agent harness (test driver) captures the grid at Verify time and uploads it (POST body on `/verify`, optional in v1, required in v1.1) — stored under `data/shots/`, referenced by attempt id. Screenshots + traces + seed + masks + score explanation together make every attempt **fully replayable offline**.
- Logs are the product. If it isn't in the log, it didn't happen; metrics (§7.1–7.3) are pure functions of the log, computed by `tools/report.js`.

---

## 8. Anti-overfit & integrity

### 8.1 Data splits
- Split by **source scene/photo and by time**, never by tile: all tiles from one source photo live in exactly one of `train` (practise freely), `eval` (standard benchmark set, fixed seeds), `holdout_final` (untouched until a final evaluation; includes the two holdout classes, §4.6).
- `holdout_final` results are reported separately and never used for tuning briefs or thresholds. Touching it for iteration converts it into `eval` — say so in the run log if that ever happens.
- **Procedural freshness:** eval/holdout challenges are generated from seeds minted at eval time from held-out items, so memorised (seed → answer) pairs don't transfer between runs.

### 8.2 Answer-key leak audit (release gate — run before every version ships)
Ground truth must not be recoverable from anything agent-visible. Checklist, all must pass:
- [ ] Tile image URLs are opaque (`/img/<random-id>`) — no class, label, or original filename in the path.
- [ ] Original corpus filenames (which may contain class names) never reach the client; server maps opaque id → file internally.
- [ ] No `alt`, `title`, `aria-label`, data-attribute, comment, or JS variable in the served page/JS contains label information. (Instruction text names the *target class* — that is production-faithful and allowed — but never which tiles match.)
- [ ] Network payloads (session/challenge responses) contain tile IDs and image URLs only — diff a captured response against the ground-truth file to prove no overlap data leaks.
- [ ] Images are re-encoded on ingest (strip EXIF/metadata, normalise dimensions per type) so metadata can't carry labels.
- [ ] Masks and manifests are outside the static-served tree; the server must 404 them.
- [ ] The risk score, band, and feature values are absent from all agent-facing responses (present only in logs / `/api/admin/*`).
- [ ] Error messages are production-like and content-free ("Please try again") — no "2 of your tiles were wrong."

### 8.3 Scorer overfit guards
- Per-session threshold jitter (§3.6).
- A **rotated probe set**: a small set of scorer probes (e.g. specific coherence checks) rotates monthly **[Design choice]**; agents tuned to last month's probes shouldn't score identically.
- Report gym scores **with** the caveat of §1: the gym measures gym performance; transfer is tested only via holdout classes/styles and, ultimately, production outcomes logged in the CAPTCHA failure log (`~/TOOLS.md`).

### 8.4 Style transfer sets
Held-out *styles* (not just classes): a synthetic-render style and a low-quality/phone-photo style excluded from `train`, present in `eval`, to detect agents that learned the corpus's photographic style instead of the classes.

---

## 9. v1 scope cut & acceptance criteria

### 9.1 v1 (build this)
1. Server skeleton: sessions, gym cookie profiles, scenario forcing (§2.4), JSONL logging.
2. **Checkbox gate + token** (§3.2) with the two separate clocks.
3. **Type A static** (§3.3) and **Type A dynamic** (§3.4) with both failure modes (verify-too-early, stale tile).
4. **Mock risk scorer** (§6) with all seven features at plausibility level, band mapping, in-session deltas, cooldown (§3.6).
5. **Ground-truth contract** (§4) implemented for Type A (labels + ambiguity band flag on tiles).
6. **Metrics + baseline report** (§7): `tools/report.js` emits a one-page report (all three levels) from the logs.
7. Corpus: v1 Type A minimums (§5.4) from openly licensed images + synthetic tiles.
8. Leak audit (§8.2) passing.

### 9.2 v1.1 (next)
- **Type B 4×4** (§3.5) with mask-derived ground truth, sliver-band scenes, per-tile overlap bands.
- Screenshot upload required; `/results` spectator polish; rotated scorer probes (§8.3); audio-challenge *placeholder* state (button present, serves "not available in this gym" — teaches agents the state exists without building it).

### 9.3 v1 acceptance criteria (all must hold)
- [ ] A browser-worker agent, given only the gym URL and a plain instruction ("complete the verification on this page"), can run a full session end-to-end: page load → checkbox → any challenges served → token or cooldown.
- [ ] Every round attempt is scored server-side and appended to `attempts.jsonl` with seed, ground truth, outcome split (FP/FN/bands), procedure errors, risk explanation, timing, and event trace.
- [ ] Token rules verified by test: reuse rejected, +121 s use rejected, valid use accepted.
- [ ] Challenge-clock expiry demonstrably independent of token clock.
- [ ] Dynamic mode: a scripted "perfect but impatient" agent (verifies during fades) fails with `verify_too_early`; a scripted agent clicking a replaced tile gets `stale_tile` without a perception penalty; a patient exact agent passes.
- [ ] Static mode: a 0-target grid is passable *only* via Skip; Verify-with-none logs `verify_instead_of_skip`.
- [ ] Scorer: a no-mouse-movement, webdriver-flagged session is served strictly harder challenges than a clean, cookied, pointer-active session (directional check of the research ordering — exact numbers are design choices).
- [ ] `tools/report.js` produces the baseline report from logs alone, showing session pass rate **and** per-challenge exact-match, sliver recall (Type A analogue: small-instance recall), and all procedure-error rates.
- [ ] Leak audit (§8.2) passes, verified by capturing raw client traffic for one full session.
- [ ] No external network calls: the app runs with the VM's WAN disconnected.

---

## 10. Open questions / risks

**Decisions flagged for Ben:**
- **Q1 — Corpus sourcing.** Openly licensed photo sets (COCO/Open Images) give real masks and realism, but licence bookkeeping and download curation take effort; a synthetic-first corpus is faster and gives exact sliver control but risks a style gap vs. production photos. *Spec default: licensed photos for Type A + synthetic-heavy for Type B slivers.* Ben's call if he wants generated-only (faster, weaker transfer) or photo-first (slower, stronger).
- **Q2 — Spectator dashboard.** v1 ships a minimal `/results` page. A richer live dashboard (watch agents attempt in real time) is genuinely useful for Ben's "let me see it work" style but is pure cost in v1. *Spec default: minimal page in v1, revisit after baseline.*
- **Q3 — Worker input channel.** The research's sharpest behavioural finding is that *which channel generates events* (OS-level vs WebDriver/CDP) can matter more than any pointer cosmetics — and our managed browser workers are what they are. The gym faithfully *measures* this (F1/F4) but cannot fix the channel. If gym results show the channel dominating, the follow-on project is input-channel work, not more gym. Ben should know this ceiling exists before investing in v2.

**Risks:**
- **R1 — Scorer overfit (highest).** Agents tuned against §6 will learn §6. Mitigations: jitter, rotated probes, holdout classes/styles, and the standing rule that **production outcomes (the TOOLS.md failure log) outrank gym scores** as evidence.
- **R2 — Ambiguity-band drift.** If annotators over-use the band, headline metrics inflate. Guard: band share of tiles is itself a reported metric; >15% band share in a corpus batch triggers re-annotation review **[Design choice]**.
- **R3 — Corpus realism gap.** Synthetic Type B scenes may be visibly cleaner than production's noisy corpus; suspicious production sessions get *harder, noisier* images **[Research: Hossen]**. v1.1 should add a noise/blur ladder (§5.3 axes) rather than pretend one difficulty fits all.
- **R4 — Metric gaming by brief-writers (us).** E.g. a brief that says "always wait 20 s" games F5 without learning pacing. Mitigation: timing is scored as a *band + variance*, and Level C reports distributions, so degenerate strategies show up as degenerate distributions.
- **R5 — Scope creep toward production evasion.** The gym's purpose is training our agents for user-requested tasks. Any feature whose only use is defeating third-party production challenges (token harvesting, solver-service integration, fingerprint spoofing toolkits) is out of scope by §1 and should be rejected at review.

---

## Appendix A — Key evidence → design traceability

| Design element | Source |
|---|---|
| Token single-use, 120 s expiry | Google Developers, Verifying the user's response **[Documented]** |
| Checkbox → pass-or-challenge; difficulty adapts to trust | Google Developers, Choosing the type of reCAPTCHA; Hossen et al. 2021 **[Documented/Credible]** |
| Cookies/history = strongest round-count lever; ETH Zurich 2024 | Plesner, Vontobel & Wattenhofer 2024 (attribution per verification pass) |
| Movement matters; curve shape ≈ no significant effect | Perplexity verification pass reading of Plesner et al. — **overrides** the secondary-summary Bézier medians in the original report |
| Exact-match default; one-error forgiveness only at "Easiest" | Hossen et al. 2021, near-miss probing (Table 4) |
| Partial-object = overlap rule; stipulated negatives (shadow/pole) | Plesner et al. solver procedure; ambiguity per Catanzaro 2017; stipulation is ours |
| Session vs per-challenge metric split (58% → 92.6%) | Sivakorn & Gottlieb 2026 (Robot Visions) |
| WebDriver sessions: harder mix, rejections, blocks | Hossen et al. 2021; RAID/USENIX 2020 study via Perplexity (∼27% vs ∼87% Selenium contrast) |
| Timing as ranges/bands, never constants | NDSS 2025 user study (≈10–10.6 s image); Searles et al., UC Irvine 2023 (≈18–22 s); solver band 14–19 s |
| Cooldown instead of endless escalation; randomized bands; dual-label ambiguity accounting; three-level metrics | Perplexity verification pass, Part 2 (design additions) |
| Failure taxonomy (trust / perception / literalness / grounding / procedure / latency) | Deep-research report §4 (CAPTCHA-X; Hossen; Robot Visions) |

*End of spec v0.1.*
