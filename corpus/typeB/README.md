# Type B corpus — built in v1.1

352 synthetic scenes (480×480) with per-class segmentation masks, built by
`tools/build_corpus_typeb.js` — see `manifest.jsonl` in this directory and
the Type B section of `../../CREDITS.md` for provenance, and BUILD_NOTES.md
(§v1.1) for the design. 44 scenes are sliver-engineered (a measured target
fragment of 0.5–5% of a tile straddling a grid line, SPEC §5.4).

Ground truth is derived at build time from the masks per SPEC §4
(positive ⇔ overlap ≥ 0.5% of tile area; ambiguity band 0.5–2%) and cached
in each manifest record's `derived_tiles`. Masks and manifests are
server-side only — they are never served to clients (SPEC §8.2).
