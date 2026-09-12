# From the framework to the calculation

Version **1.0.0** · convention **encounter-coverage-1**

Scene Companion demonstrates one application of the Atmospheric Communication Model. Its reasoning chain is:

**ordinary scene facts → applicable encounter requirements → coverage and uncertainty → a concrete comparison → human interpretation**

The theoretical model explains atmospheric communication as situated sense-making through expressive configurations and player encounters. The software operationalizes a narrow part of that account: whether selected relationships can be encountered under the supplied facts. The numerical conventions are implementation choices, not quantitative laws established by the thesis cases.

## Framework and rule mapping

| Framework distinction | Ordinary fact | Programmed requirement | What remains with the person |
|---|---|---|---|
| M1: Relational and Sequential Configuration | Two elements accompany one another, or one follows the other | Joint availability or the declared temporal order | What the relationship means; whether contrast is productive |
| M2: Encounter, Path, and State | The player returns to a changed state | Access to an earlier-state reference | Whether the player notices or recognizes the change |
| M2: Encounter, Path, and State | An action is followed by a presented change | Both can be encountered within the assessed sequence | Causation, intention and felt agency |
| M3: Narrative Relation Under Constrained Possibility | A farewell, absence or other change frames a scene | Preserve the supplied reading when comparing the selected encounter conditions; no numerical meaning rule is added | Narrative significance and supported experiential possibilities |
| Shared evidence distinction | Facts are observed, proposed or unknown | Keep source and proposal status; return unknown bounds; retain comparison inputs | Source checking, interpretation and any response claim |

M3 is a semantic boundary for this application, not a text-understanding subsystem. The engine does not infer emotion or parse scene prose. It translates the bounded selections and optional physical timings into the applicable checks.

## Calculation

For each represented situation `s`, let `R_s` be earlier-reference availability, `A_s` the availability of an action's following presentation, and `C_s` joint or ordered availability. A condition that does not apply contributes 1.

```
coverage_s = R_s × A_s × C_s
coverage   = 100 × sum(coverage_s) / number_of_situations
```

Qualitative requirements are 1 when supplied and 0 when absent. Unknown requirements have bounds [0, 1]. Only `C_s` can become a fractional interval measure. The multiplication gives necessary conditions conjunctive force; it is not multiplication of independent probabilities or averaging of user quality ratings.

A changed return with an optional earlier visit creates two explicit situations: earlier visit encountered and earlier visit skipped. Their reference values are 1 and 0. They receive equal test weight, with no inferred frequency or likelihood. Otherwise the engine assesses one described encounter. It does not generate every route through a game.

For simultaneous availability without timings, `C_s` is 1 if both elements remain available, 0 if the companion is absent, or [0, 1] if unknown. Contrasting moods do not lower it. For an ordered relationship, `C_s` is 1 if the companion follows, 0 if it precedes, or [0, 1] if order is unknown. Simultaneous overlap is not required for sequence.

### Optional timing

Let `W > 0` be the duration of the assessed moment, `t` the companion's start relative to that moment (negative means earlier), and `D > 0` its duration. The moment occupies [0, W] and the companion [t, t + D]. Then:

```
overlap = max(0, min(W, t + D) - max(0, t))
C_s     = min(1, overlap / W)
```

Timing replaces qualitative joint availability; it is not an extra penalty. The proportion uses the **assessed moment** as denominator, not the companion's duration. A seven-second event fully heard during a ten-second moment yields 0.7, not 1. No duration threshold for emotional effectiveness is asserted. This convention is useful for inspecting a bounded relationship over time, not for grading a finished scene.

If any required timing is unknown, the implementation uses conservative bounds [0, 1]; it does not optimize bounds from the remaining partial measurements. Allowed durations are greater than zero and at most 300 seconds; relative start is from −300 to 300 seconds. These are application limits, not properties of the framework.

### Uncertainty and display

The engine calculates a lower and upper result from the condition bounds. A known missing requirement can reduce both to zero even if another fact is unknown. Equal bounds give a point result, rounded once to the nearest integer for display. Otherwise the lower display bound rounds down and the upper rounds up. The code retains unrounded values. A range is unresolved information, not a confidence interval.

## Worked calculation

In the constructed room example, the earlier visit is optional and both the room and tune remain available. The two situations give 1 and 0; their mean is **50/100**. Supplying a reminder of the earlier state at the return makes the reference available in both, giving **100/100**.

In its timing variant, `W=10`, `t=−4`, `D=7`: overlap is three seconds, so `C_s=0.3`. The two situations give 0.3 and 0, for **15/100**. Starting the same seven-second tune at the beginning of the moment changes overlap to seven seconds and gives **35/100**. The original 15 remains available during comparison. Neither result predicts how a person feels.

## Comparisons and decisions

The engine proposes bounded changes supported by the inputs: supply the earlier reference here, present the following change, make a missing companion available, restore the declared order, or align an unprotected early event with arrival. Unknown facts are returned for checking rather than filled in. A protected start is retained. When two missing requirements jointly block the relationship and neither individual repair improves coverage, the engine can propose both together.

Candidates are ordered by improvement in the calculated lower bound. This ordering prioritizes coverage only; it is not a ranking of aesthetic merit. The comparison keeps the title, reading, source, encounter type, companion relation and timing window fixed. It retains the original situations when a reference is supplied at the return. Changing an optional earlier visit into a guaranteed visit changes the route premise, so the comparison rejects that scalar improvement. Changes to meaning or unit also receive no comparable delta. Unknown results receive no single-number improvement.

A preview is hypothetical. Keeping or editing a documented scene's facts changes its status to a proposal. The original is retained in a preview and can be restored or saved. Imports validate the record and recalculate the outputs; supplied cached scores are never authoritative.

## Scope of the demonstration

The useful output is an explicit dependency or missing fact, its coverage and a concrete alternative that can be considered without reconstructing the thesis. The user must still supply a truthful scene description and decide whether the selected relation matters. The tool does not cover arbitrary scenes, infer meanings, establish perceptual salience, detect causation, simulate a player or validate the framework empirically. Human interpretation, or an external system interpreting the model, remains separate from this deterministic application. No AI service runs inside it.
