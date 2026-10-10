# CAPTCHA Gym

**A self-hosted training and evaluation gym for reCAPTCHA-v2-style challenges — built to measure how well an AI browser agent solves them, against ground truth, side by side with a human baseline.**

The gym serves the full shape of the real thing: a checkbox gate backed by an
interpretable mock risk scorer, 3×3 image grids (static and dynamic
fade-and-replace), and 4×4 grids sliced from synthetic scenes *and* real
photographs. Every attempt is scored server-side against known ground truth —
per-tile true/false positives, precision/recall, exact-board rate, procedure
errors, decision times — and every session is tagged by population, so agent
play and human play accumulate into two comparable datasets on the same
challenges, under the same ruler.

It exists to answer, with data instead of vibes: *where exactly does a modern
browser agent fail at these challenges — perception, procedure, or pace — and
does targeted training (a versioned play "brief") measurably move the
numbers?*

> Status: training in progress. The results below are a dated snapshot, not
> final findings. A full write-up is planned when training completes.

## Quick start

Zero dependencies. Node 20+ standard library only, no build step.

```sh
node server.js          # listens on port 8931
```

- Play / agent page: `http://localhost:8931/`
- Spectator dashboard: `http://localhost:8931/results` — visual, procedural,
  and acceptance layers scored separately; failure taxonomy; an
  agent-vs-human population block (`?source=human` for the human slice).
- Scenarios via query string: `?scenario=natural` (default),
  `force_static`, `force_dynamic`, `force_type_b` (4×4 synthetic),
  `force_type_b_photo` (4×4 real photographs), `force_high_trust`,
  `force_low_trust`. Every `force_*` scenario always issues its challenge;
  the natural ladder lets the risk scorer decide.
- Reports: `node tools/report.js` (single population) ·
  `node tools/compare_report.js` (agent vs human)
- Tests: `node tools/e2e_test.js` · Answer-key leak audit:
  `node tools/leak_audit.js` · Corpus integrity:
  `node tools/validate_corpus.js`

## How it works

- **Two gates, like the real thing.** A checkbox click is scored by a mock
  risk engine (weighted behavioral/profile features, jittered thresholds,
  per-session trust that rises and falls with play). Passing the gate can
  end the session — or escalate to a grid. Challenge expiry (180 s) and
  token expiry (120 s, single-use) are separate clocks, as in production.
- **Ground truth never reaches the player.** All scoring is server-side.
  Tile images carry no identifiers; a dedicated leak-audit crawler verifies
  that no ground truth leaks via filenames, DOM, or metadata. An ambiguity
  band — tiles whose target overlap is small enough to be genuinely
  debatable — is excluded from scoring on both populations equally.
- **Failure taxonomy.** Every attempt is classified perception (wrong
  tiles), procedure (empty submission, verify-before-settle, expiry), or
  unscored (infrastructure), so "the agent failed" is always followed by
  "at what, exactly."

## Corpus

- **Type A (3×3):** procedurally rendered tiles; masks exact by construction.
- **Type B synthetic (4×4):** 352 rendered scenes with per-class masks,
  including sliver-engineered scenes whose correct tiles hold 0.5–5% of a
  target — the fragment calls that separate good players from lucky ones.
- **Type B photos (4×4):** 120 scenes from COCO 2017 val, admitted **only**
  under CC Attribution / Attribution-ShareAlike licenses (637 images were
  rejected on license alone), 6 classes, per-image provenance in
  `corpus/typeB/manifest_photos.jsonl` and `CREDITS.md`.

Corpus binaries (~340 MB) and the generated corpus manifests are not
tracked in git; rebuild both with `tools/build_corpus.js`,
`tools/build_corpus_typeb.js`, and `tools/build_photo_corpus.js` (the last
needs the COCO val2017 annotations). The manifests carry the ground truth;
the leak audit guarantees it never reaches a player through the game
channel. Photo-corpus provenance is summarized in `CREDITS.md`.

## Training system

The agent plays from a **versioned written brief** (`AGENT_BRIEF.md`) — the
distilled technique rules, each citing the measured failure it answers to.
The loop is deliberate:

1. Play a batch under the current brief (standing regimen: three batches a
   week — `TRAINING_REGIMEN.md`).
2. Arbitrate every attempt from the server logs; never trust self-reports.
3. Name the dominant failure mode; draft the next brief version from it.
4. Validate the candidate over ≥8 scored attempts; promote or revert it on
   the numbers, era-split, in `TRAINING_LOG.md`.

Rules that don't move numbers are folklore and get reverted. The scoreboard
already contains one instrumentation-invalid era (a front-end bug that made
every Type B submission empty) — kept, quarantined, and labeled, because a
benchmark that hides its bad data isn't one.

## Agent vs human

Human sessions are recorded under their own source tag (`?source=human-ben`
on the gym URL) and computed with the identical code path — see
`HUMAN_BASELINE.md` for the protocol and the publication notes. Known
asymmetries are disclosed, not buried: the agent plays through a managed
browser (screenshot latency inflates its decision times), the human plays
directly; the mock risk engine cannot replicate production IP/account
reputation.

## Results snapshot — 2026-10-10

Photo corpus, scored attempts, era-split (from `TRAINING_LOG.md`):

| Population / brief | Attempts | Precision | Recall | Exact board | Expiries |
|---|---|---|---|---|---|
| Agent, brief v1 | 8 | .949 | .881 | 3/8 | 2 |
| Agent, brief v2 | 8 | 1.000 | .833 | 6/8 | 2 |
| Agent, brief v2.1 (candidate) | 5 | .923 | .857 | 3/5 | 0 |
| Human (opening sessions) | 2 | 1.000 | 1.000 | 2/2 | 0 |

Read small samples as small samples. The v1→v2 story so far is compositional:
v2 eliminated sliver misses entirely (v1's main leak) and doubled exact
boards, while exposing whole-instance misses on crowded scenes — which is
what v2.1's census rule exists to fix, and what it is currently being
validated on.

## Fidelity limits — read before citing

1. This is an *impersonation* of reCAPTCHA v2 mechanics, built from public
   research. The mock risk scorer's weights are design choices; Google's are
   unpublished and unknowable from here.
2. The corpus is finite and self-made; production draws on a vast, shifting
   corpus with deliberately ambiguous items.
3. Production risk decisions lean on IP/account reputation at a scale no
   local harness can simulate; the gym stubs it as a per-profile feature.
4. Tokens minted here are meaningless outside the gym.

## Scope and ethics

The gym trains and evaluates **our own agent, on our own site**, for
challenges it meets inside tasks the user requested. It is not a
CAPTCHA-solving service, is never pointed at third-party sites, and the
agent's standing instructions for real sites are a separate, user-controlled
setting. Human-baseline play is by the project's owner, recorded with
consent, published in aggregate.

## Repository layout

- `server.js` — the whole server (stdlib only)
- `public/` — the player-facing page and dashboard client
- `tools/` — corpus builders, e2e suite, leak audit, reports, ops scripts
- `SPEC.md` — design authority · `BUILD_NOTES.md` — the build journal
- `AGENT_BRIEF.md` — the versioned play briefs ·
  `TRAINING_REGIMEN.md` / `TRAINING_LOG.md` — protocol and scoreboard
- `HUMAN_BASELINE.md` — human protocol and publication notes ·
  `CREDITS.md` — corpus licensing and attribution

## License

MIT — see `LICENSE`. Photo-corpus images remain under their original
CC licenses (see `CREDITS.md`).
