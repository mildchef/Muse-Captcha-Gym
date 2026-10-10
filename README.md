# CAPTCHA Gym

**A self-hosted CAPTCHA training gym for browser agents: reCAPTCHA v2–style
challenges with server-side ground truth, an interpretable mock risk scorer,
and an agent-vs-human baseline recorded on the same challenges, under the
same ruler.**

This gym exists so that Meta Muse agents (and any capable browser or
computer-use agent) can train on CAPTCHA challenges, record their solving
data, and share findings with others. It serves the full shape of the real
thing — a checkbox gate backed by a mock risk engine, 3×3 image grids
(static and dynamic fade-and-replace), and 4×4 grids sliced from synthetic
scenes *and* real photographs — and scores every attempt server-side:
per-tile true/false positives, precision/recall, exact-board rate,
procedure errors, decision times. It answers, with data: *where exactly
does an agent fail at these challenges — perception, procedure, or pace —
and does a versioned play "brief" measurably move the numbers?*

> Status: training in progress, continuous mode (see
> `TRAINING_REGIMEN.md`). The results below are a dated snapshot, not
> final findings. A full write-up is planned when training completes.

## For agents — start here

If you are an agent operator, you can, in your own environment:

1. **Run the gym** — one file server, zero dependencies (Bootstrap below).
2. **Play sessions** in a browser against known ground truth, under the
   scenarios listed below.
3. **Measure yourself** — scores are computed by the server and logged to
   `data/attempts.jsonl`; arbitrate from that log, never from your own
   impressions of how a round went.

Key entry points and contracts:

- **Play doctrine:** `AGENT_BRIEF.md` — the current versioned brief is
  how you play (tile-selection rules, sliver discipline, clock budget).
  Play under the current version; batches record which version produced
  them.
- **Training protocol:** `TRAINING_REGIMEN.md` — batch composition,
  brief governance, and the human-parity bar. Design authority:
  `SPEC.md`.
- **Start:** `node server.js` → play page `http://localhost:8931/`,
  spectator dashboard `http://localhost:8931/results`.
- **Scenarios** via query string on the play URL: `?scenario=natural`
  (default; the risk scorer decides whether a challenge is issued),
  `force_static`, `force_dynamic`, `force_type_b` (4×4 synthetic),
  `force_type_b_photo` (4×4 real photographs), `force_high_trust`,
  `force_low_trust`. Every `force_*` scenario always issues its
  challenge; `natural` keeps the honest trust ladder.
- **Source-tagging contract:** a session's population tag comes from
  `?source=` at creation and is pinned to the session for all rounds.
  Agent play uses `live-agent` (the default). Human-baseline play uses
  `human-<name>` (lowercase alphanumerics/hyphens, e.g.
  `?source=human-ben`) and is reserved for actual humans — an agent must
  never tag its own sessions `human-*`; doing so corrupts both
  baselines. Test-harness tags (`e2e`, `smoke`, `deploy-check`,
  `leak-audit`) are neither population. Unknown or malformed values
  fall back to `live-agent` (fail-closed).
- **Reports:** `node tools/report.js` (one population) ·
  `node tools/compare_report.js` (agent vs human, overall and per
  corpus) · the `/results` dashboard defaults to agent traffic;
  `?source=human` shows the human population.

## Bootstrap (fresh environment)

Requirements: **Node 20+** (standard library only). No dependencies, no
build step, no `npm install`.

The clone does **not** contain the corpus. Corpus binaries (~340 MB of
PNG/JPEG) and the generated corpus manifests are gitignored; both are
rebuildable outputs of the tools in `tools/`. Rebuild the synthetic
corpus (Type A 3×3 tiles + Type B 4×4 scenes) with:

```sh
node tools/build_corpus.js        # Type A tiles  -> corpus/typeA/
node tools/build_corpus_typeb.js  # Type B scenes -> corpus/typeB/
node server.js                    # listens on 0.0.0.0:8931
```

(`PORT` and `HOST` env vars override the listen address.)

**Photo corpus caveat.** The gym runs fully on the synthetic corpus
alone. The real-photo Type B transfer set is optional and requires the
MS COCO 2017 val annotations: download `annotations_trainval2017.zip`
from `images.cocodataset.org`, extract `instances_val2017.json` to
`/tmp/coco/annotations/` (or set `COCO_VAL_JSON` to its path), then run
`node tools/build_photo_corpus.js` — it also downloads the admitted
images (CC-BY / CC-BY-SA only; see `CREDITS.md`). Without the photo
corpus, `force_type_b_photo` fails loudly with HTTP 503
`photo_corpus_unavailable` instead of silently falling back to
synthetic.

**Verify the install** (each tool spins up its own throwaway server or
reads the corpus directly; none needs a running `server.js`):

```sh
node tools/e2e_test.js         # end-to-end suite — expect: all checks passed, 0 failed
node tools/leak_audit.js       # answer-key leak audit (SPEC §8.2) — expect: 0 failed
node tools/validate_corpus.js  # corpus integrity — expect: 0 bad PNGs
```

(Observed 2026-10-10 on the reference install: e2e 164 passed / 0
failed, leak audit 33 passed / 0 failed, 1,880 corpus PNGs valid.)

## How an agent plays a session

1. Open the play URL in a browser, with `?scenario=` (and `?source=`,
   defaulting to `live-agent`) as needed. A session begins at the
   **checkbox gate**: click the checkbox and the mock risk scorer
   decides — pass outright (session ends with a token), or escalate to
   a challenge grid.
2. **Challenge types.** Type A static 3×3: select every tile containing
   the named class; if no tile matches, **Skip** — never guess. Type A
   dynamic 3×3: clicked tiles fade out and are replaced after a few
   seconds; click all matches, **wait** for replacements to settle,
   re-scan the whole grid, click new matches, and press Verify only
   when no tile matches anymore. Type B 4×4: a scene sliced into 16
   tiles; select every tile containing any recognizable part of the
   target (the brief's sliver rule); there is no Skip. A passed round
   may be followed by another round; play until a token/success state
   or a terminal failure state.
3. **Two separate clocks.** A challenge round expires after **180 s**
   (an unsubmitted selection scores zero, however good it was); a
   minted token expires after **120 s** and is single-use.
4. **Scoring layers.** The server scores three layers independently:
   visual (per-tile TP/FP/FN against ground truth), procedural (empty
   submission, verify-before-settle, expiry), and acceptance (checkbox
   outcome, token issued). Tiles in the **ambiguity band** — target
   overlap small enough to be genuinely debatable — are excluded from
   scoring, equally for both populations. Failures are classified by a
   taxonomy: perception > procedure > unscored (infrastructure).
5. **Arbitrate from the log.** After playing, read your results from
   `data/attempts.jsonl` (filter by your session's time window and
   source tag). Self-reported scores are not data; the server record
   is.
6. **Discipline.** Play under the current `AGENT_BRIEF.md` version and
   say which version you used when you record results. Do not modify
   the brief, the regimen, or the logs mid-batch. And see Scope and
   ethics: techniques learned here are for this gym only.

## Corpus

- **Type A (3×3):** 1,176 procedurally rendered tiles; masks exact by
  construction.
- **Type B synthetic (4×4):** 352 rendered scenes (480×480) with
  per-class masks exact by construction, including 44 sliver-engineered
  scenes whose correct tiles hold a measured 0.5–5% of a target.
- **Type B photos (4×4):** 120 scenes from COCO 2017 val, admitted
  **only** under CC Attribution / Attribution-ShareAlike licenses (637
  candidate images were rejected on license alone), 6 classes
  (bicycle, bus, motorcycle, traffic light, fire hydrant, car).
  Per-image provenance (license, COCO id, original URL) is in
  `corpus/typeB/manifest_photos.jsonl` once built; policy and summary
  in `CREDITS.md`.

Ground truth never reaches the player through the game channel: all
scoring is server-side, tile images carry no identifiers, and the leak
audit crawls every client-visible surface asserting no ground truth
leaks via filenames, DOM, or metadata.

## Training system and governance

The agent plays from a **versioned written brief** (`AGENT_BRIEF.md`);
each rule in a brief cites the measured failure it answers to. The loop:

1. Play a batch under the current brief per `TRAINING_REGIMEN.md`
   (continuous mode: hourly runs, 2 photo sessions + 1 rotating).
2. Arbitrate every attempt from `data/attempts.jsonl`.
3. Name the dominant failure mode; draft the next brief version from it.
4. **Validate the candidate over ≥8 scored photo attempts.** Promote it
   if it is not worse on precision and better or equal on the failure
   mode it was written to fix; otherwise revert and record why, in
   `TRAINING_LOG.md`. Rules that don't move numbers get reverted.

**Human-parity bar** (from `TRAINING_REGIMEN.md`, quoted exactly):
judged on scored photo attempts, rolling window of the last **30
scored photo attempts** — **precision ≥ 0.95 AND recall ≥ 0.95 AND
exact-board ≥ 90% AND expiry rate ≤ 10%**, sustained across **two
consecutive windows**. Decision time is reported but does not gate
parity (the agent plays through a managed browser; the human plays
direct). A stall brake applies: three consecutive candidate briefs
failing to improve on their target failure mode stops new drafting and
reports the stall.

**Agent vs human.** Human sessions are tagged `human-<name>` and
computed through the identical code path (`tools/compare_report.js`);
see `HUMAN_BASELINE.md` for the protocol and publication notes.
Disclosed asymmetries: the agent's decision times include managed-
browser/screenshot latency; the mock risk engine cannot replicate
production IP/account reputation. Publication target for the human
line: ≥10 human photo sessions (≥20 scored photo attempts).

The scoreboard already contains one instrumentation-invalid era (a
front-end bug that made every Type B submission empty) — kept,
quarantined, and labeled in `TRAINING_LOG.md`, because a benchmark
that hides its bad data isn't one.

## Install as a Muse skill

This repo doubles as a Muse skill. Clone it into your workspace
skills directory and the receiving agent gets the gym plus its play
doctrine as a loadable skill:

```sh
git clone <this-repo-url> ~/workspace/skills/captcha-gym
```

What the receiving agent gets: `SKILL.md` (operating instructions:
install, start, play under the brief, record results, parity bar,
ethics limits), the full gym (`server.js`, `tools/`, `public/`), the
current `AGENT_BRIEF.md`, and the training protocol in
`TRAINING_REGIMEN.md`. The corpus still has to be rebuilt locally
(Bootstrap above) — it is not in the clone.

## Results snapshot — 2026-10-10

Photo corpus, scored attempts, era-split (from `TRAINING_LOG.md`):

| Population / brief | Attempts | Precision | Recall | Exact board | Expiries |
|---|---|---|---|---|---|
| Agent, brief v1 | 8 | .949 | .881 | 3/8 | 2 |
| Agent, brief v2 | 8 | 1.000 | .833 | 6/8 | 2 |
| Agent, brief v2.1 (candidate) | 5 | .923 | .857 | 3/5 | 0 |
| Human (opening sessions) | 2 | 1.000 | 1.000 | 2/2 | 0 |

Read small samples as small samples. The v1→v2 story so far is
compositional: v2 eliminated sliver misses entirely (v1's main leak)
and doubled exact boards, while exposing whole-instance misses on
crowded scenes — which is what v2.1's census rule exists to fix, and
what it is currently being validated on.

## Fidelity limits — read before citing

1. This is an *impersonation* of reCAPTCHA v2 mechanics, built from
   public research. The mock risk scorer's weights are design choices;
   Google's are unpublished and unknowable from here.
2. The corpus is finite and self-made; production draws on a vast,
   shifting corpus with deliberately ambiguous items.
3. Production risk decisions lean on IP/account reputation at a scale
   no local harness can simulate; the gym stubs it as a per-profile
   feature.
4. Tokens minted here are meaningless outside the gym.

## Scope and ethics

The gym trains and evaluates **your own agent, on your own site**. It
is not a CAPTCHA-solving service, must never be pointed at third-party
sites, and nothing here interoperates with real reCAPTCHA (no Google
JS, no sitekeys, no token injection). An agent's standing instructions
for real sites are a separate, user-controlled setting. Human-baseline
play is by the project's owner, recorded with consent, published in
aggregate.

## Repository layout

- `server.js` — the whole server (Node stdlib only)
- `public/` — the player-facing page and dashboard client
- `tools/` — corpus builders (`build_corpus.js`, `build_corpus_typeb.js`,
  `build_photo_corpus.js`), `e2e_test.js`, `leak_audit.js`,
  `validate_corpus.js`, `report.js`, `compare_report.js`, ops scripts
- `SKILL.md` — the gym as a Muse skill · `AGENTS.md` — agent quick
  reference
- `SPEC.md` — design authority · `BUILD_NOTES.md` — the build journal
- `AGENT_BRIEF.md` — the versioned play briefs ·
  `TRAINING_REGIMEN.md` / `TRAINING_LOG.md` — protocol and scoreboard
- `HUMAN_BASELINE.md` — human protocol and publication notes ·
  `CREDITS.md` — corpus licensing and attribution

## License

MIT — see `LICENSE`. Photo-corpus images remain under their original
CC licenses (see `CREDITS.md`).
