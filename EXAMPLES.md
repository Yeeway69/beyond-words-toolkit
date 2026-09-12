# Examples and provenance

The presets are illustrative applications of one toolkit, not separate tools. The room, music and sequence examples are **author-constructed**. Their wording is not a quotation or observation from a game. They appear in the thesis to make this application's mechanism inspectable. Timing values are stipulated, not measurements or participant data.

`assessment.js` owns the preset facts. The release's editable JSON records and readable results are generated from those same facts, reducing drift between the interface and delivery copy.

| Preset | Status | What it demonstrates |
|---|---|---|
| An empty room on returning | Constructed | Optional earlier reference: 50; reminder at return: 100 |
| A brief tune that starts early | Constructed | Ten-second moment, tune from −4 to +3: 15; start at arrival: 35 |
| Cheerful music, an empty room | Constructed | Joint availability: 100; contrast is not automatically a fault |
| Silence, then a melody | Constructed | Sequential rather than simultaneous availability: 100 |
| A reference we have not checked | Constructed unknown | Unresolved earlier reference: 0–100, not 50 |
| Life is Strange: choice and consequence | Documented illustration | One selected action followed by presented consequences: 100; no effect claim |

## Documented illustration: LIS-AV-002

*Life is Strange* (Dontnod Entertainment, 2015), Episode 5, original release as represented by a recording predating the 2022 remaster. Platform, patch and build are unknown.

Source: KnightWalkthroughHD, **LIFE IS STRANGE FULL GAME | NoCommentary | Gameplay Walkthrough**, uploaded June 16, 2019. [Recorded sequence, 10:25:27–10:34:50](https://www.youtube.com/watch?v=qYnhpWf20So&t=37527s). Thesis record accessed August 29, 2026 and closely viewed August 30, 2026.

The recording shows two final choice options, selects **Sacrifice Chloe**, and follows that route through farewell, photographic temporal return, the restroom sequence, montage, funeral and fade. The unselected branch is outside this evidence boundary. The audiovisual sequence, not two isolated stills, establishes the enacted choice and its following presentation.

The application records `move=act`, `response=visible`, and no companion or timing values. A result of **100/100** means that the selected action and following presentation are available within this specified encounter. It does not establish causal understanding, experienced agency, grief, closure, emotional effectiveness or the superiority of this ending. No player-response evidence or fine soundtrack timing is supplied.

This reuses evidence discussed in the thesis's model-refinement chapter. It is a transparent application of that record, **not independent validation**. No game video, screenshots, audio or other copyrighted media are redistributed in this repository. Editing the preset's facts creates a proposal; keep its documented source separate from any imagined alternative.

## Open the records

The release includes `examples/room.json`, `room-comparison.json`, `timing.json`, `timing-comparison.json`, `life-is-strange.json`, `contrast.json`, `sequence.json` and `unknown.json`. Use **Open saved work** to load them. Matching `.md` files show the inputs, rules and results without running the app. The two comparison records preserve the original scene and the proposed change.
