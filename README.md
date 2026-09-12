# Beyond Words — Scene Companion

A small, browser-based application of Yiwei Ye's Atmospheric Communication Model, developed for *Beyond Words: A Situated Model of Atmospheric Communication in Video Games* (CITM, Universitat Politècnica de Catalunya, 2026).

Describe a scene using ordinary facts. The tool identifies which relationships need an earlier reference, a shared encounter, an ordered presentation or a following change. It calculates **encounter coverage**, explains the result and offers a reversible comparison. You retain interpretation and artistic judgment.

**[Open the toolkit](https://yeeway69.github.io/beyond-words-toolkit/)** · **[Download v1.0.0](https://github.com/Yeeway69/beyond-words-toolkit/releases/tag/v1.0.0)** · [Mechanism](MECHANISM.md) · [Examples and provenance](EXAMPLES.md)

## Try it

Choose **An empty room on returning**. The earlier visit can be encountered or skipped, so the two described situations produce **50/100**. Preview **Show the earlier state at the return**: a reminder supplies the reference in both situations, producing **100/100**. The original remains available. The number describes the availability of this relationship; it does not establish that a player notices the reminder or feels the intended atmosphere.

To use your own scene, clear the example, name the moment and choose what the player does. Only relevant questions appear. Optional timing uses seconds, not abstract quality ratings. The scene title and your reading are labels; the program does not interpret their words.

## Use without an account or installation

The hosted app requires no visitor account. For offline use, download `Beyond_Words_Scene_Companion_v1.0.0.zip` from the release, extract it, and open **index.html** in a desktop browser. Keep its files together. No terminal, application server, model API or runtime AI is needed. Links to the website, source or external evidence need an internet connection; the calculation itself does not.

The four runtime files are `index.html`, `assessment.css`, `assessment.js` and `assessment-app.js`. This repository contains one application.

## Save, reopen and correct

**Save editable work** downloads a JSON file containing your scene, its evidence context and any comparison baseline. **Open saved work** restores it and recalculates the result. **Save result** downloads a readable Markdown explanation, including the comparison when present. Check your browser's downloads before closing or reloading; the tab is not a persistent backup.

**Undo** restores the previous edit, example, clear or import. It is one-step recovery, not a complete history. Invalid imports preserve the current work. Earlier toolkit formats are rejected rather than silently reinterpreted.

For an existing work, expand **Your reading and evidence**, identify the source, edition and interval, and select **A documented encounter** after checking the facts. Editing those facts changes the working record to a proposal. A comparison remains hypothetical and retains the original. Editing your interpretation alone does not rewrite the observed facts.

## What the signal can tell you

Coverage is a disclosed operational convention, `encounter-coverage-1`. It combines necessary conditions within each explicitly represented situation and gives those situations equal test weight. Optional timing replaces joint availability with interval overlap. Unknown facts produce bounds, never a guessed midpoint.

A result of 50 is **not** a 50% probability of success. A result of 100 does not prove attention, recognition, emotional effect, aesthetic quality, causation or experienced agency. Brief appearances, deliberate contrast and optional discovery can be appropriate. Higher coverage is not automatically a better artistic choice. Untimed facts often yield 0, 50 or 100; timing provides finer differences only when supported by the supplied values.

The tool demonstrates a bounded application of the theoretical framework. Its internal examples and software checks do not establish independent usability or empirical player effects.

## Inspect and reproduce

The engine is in `assessment.js`; the interface is in `assessment-app.js`, `index.html` and `assessment.css`. [MECHANISM.md](MECHANISM.md) maps the rules to the framework and explains the exact calculation. [EXAMPLES.md](EXAMPLES.md) distinguishes constructed records from the documented *Life is Strange* illustration. The `examples` folder contains editable records generated from the same presets used by the application.

For developers, run `node --test assessment.test.js`. The tests cover the calculation, uncertainty, comparisons, provenance requirements, import validation and boundedness. They are software checks, not participant research. The submitted software is version **1.0.0**, tagged **v1.0.0**; release checksums identify the portable archive and its contents. Citation metadata is in `CITATION.cff`.

## Privacy and licence

The application sends no entered scene data to a server and uses no analytics, external fonts or remote runtime libraries. Saved files stay where your browser downloads them. The hosting provider may process ordinary visit information; see [GitHub's Pages documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages).

Copyright © 2026 Yiwei Ye. The toolkit implementation (`.html`, `.css` and `.js` files) is available under the [MIT licence](LICENSE). This code licence does not grant rights to the thesis or third-party games, recordings or other referenced material. No game media or private thesis repository history is included.
