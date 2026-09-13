# Scene assessment

Engine: 1.0.3
Convention: encounter-coverage-1
Evidence context: constructed or proposed scene

## Supplied facts

Scene:
> A familiar room after the farewell

Reading or intention (supplied, not inferred):
> The room feels changed after spending time together.

Source / provenance:
> Author-constructed demonstration; not game or participant evidence.

Player situation: Returns to something changed
Reference: Earlier visit can be encountered or skipped
Relationship: Together
Companion:
> The cheerful tune
Scene window: 10 seconds
Companion starts relative to arrival: 0 seconds
Companion duration: 7 seconds
Preserve the current timing: no

## Computed signal

35/100

The earlier visit can be skipped.

Without an earlier view, the player has no reference for recognising what changed. The companion is also available for 7 of 10 seconds.

Reference for the change: 50
A return can include or omit the earlier reference. Both described situations are assessed; neither is assigned a probability.

Combination available: 70
The supplied intervals overlap for 7 of the 10-second scene window. This replaces the qualitative availability check; it is not a second penalty.

Earlier visit encountered: 70

Earlier visit skipped: 0

## Comparison

Original: 15/100. Revised provision: 35/100.
The original set of described situations is held fixed. A changed observation is a proposal until separately observed.

### Changed fields

cueStart: -4 → 0

### Original supplied record

The following is the original input record, not a cached result:

```json
{
  "version": 1,
  "context": "proposal",
  "source": "Author-constructed demonstration; not game or participant evidence.",
  "title": "A familiar room after the farewell",
  "reading": "The room feels changed after spending time together.",
  "move": "return",
  "reference": "optional",
  "response": "",
  "companion": "The cheerful tune",
  "relation": "together",
  "availability": "present",
  "order": "",
  "timed": true,
  "windowSeconds": 10,
  "cueStart": -4,
  "cueSeconds": 7,
  "protectTiming": false
}
```

## Interpretation limits

The human supplies scene identity, facts and meaning. The engine derives reference, response, co-presence and sequence requirements from those facts. It does not interpret arbitrary prose.
Coverage is an author-designed operational convention, not an equation derived from the cases, measured atmosphere, a probability, a universal quality threshold or proof of player response.
Optional reference situations are equally weighted test situations, not observed frequencies. Unknowns bound the index; they are not assigned a midpoint. Complete presentation does not prove attention, understanding, causation or agency.
Proposals are not observations. Identified sources remain necessary for documented analysis. More cues or repeated copies do not add points.
