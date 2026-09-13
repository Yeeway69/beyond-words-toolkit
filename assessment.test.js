'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const engine = require('./assessment.js');
const scene = patch => ({ ...engine.examples.return, ...patch });

test('return example computes 15, context revision 30, timing revision 35', () => {
  assert.equal(engine.assess(scene()).score, 15);
  assert.equal(engine.assess(scene({ reference: 'before' })).score, 30);
  assert.equal(engine.assess(scene({ cueStart: 0 })).score, 35);
  assert.deepEqual(engine.assess(scene()).scenarios.map(item => item.low), [30, 0]);
  assert.equal(engine.assess(scene()).headline, 'The earlier visit can be skipped.');
  assert.match(engine.assess(scene()).reason, /3 of 10 seconds/);
  assert.doesNotMatch(engine.assess(scene()).reason, /averag|probability|likelihood/);
});
test('a missing essential reference cannot be offset by full companion availability', () => {
  assert.equal(engine.assess(scene({ reference: 'missing', cueStart: 0, cueSeconds: 10 })).score, 0);
});
test('constructive contrast is not penalized for opposed moods or duplicated prose', () => {
  const baseline = engine.assess(engine.examples.contrast);
  assert.equal(baseline.score, 100);
  assert.equal(engine.assess({ ...engine.examples.contrast, companion: 'Tune, tune, tune, tune' }).score, 100);
  assert.match(baseline.checks[0].reason, /deliberate contrast/);
});
test('ordered events need order rather than simultaneous overlap', () => {
  assert.equal(engine.assess(engine.examples.sequence).score, 100);
  assert.equal(engine.assess({ ...engine.examples.sequence, order: 'precedes' }).score, 0);
  assert.equal(engine.assess({ ...engine.examples.sequence, order: 'unknown' }).display, '0–100');
});
test('following presentation does not claim causation or agency', () => {
  const result = engine.assess(engine.examples.action);
  assert.equal(result.score, 100);
  assert.match(result.checks[0].reason, /does not establish causation or experienced agency/);
  assert.equal(engine.assess({ ...engine.examples.action, response: 'elsewhere' }).score, 0);
});
test('documented ending example preserves one recorded route without inferred timing', () => {
  const record = engine.examples.action;
  assert.equal(record.context, 'observation');
  assert.match(record.source, /LIS-AV-002/);
  assert.match(record.source, /10:25:27–10:34:50/);
  assert.match(record.source, /platform, patch and build unknown/);
  assert.equal(record.timed, false);
  assert.equal(record.windowSeconds, null);
  assert.equal(record.cueStart, null);
  assert.equal(record.cueSeconds, null);
  assert.match(engine.report(record), /selected Sacrifice Chloe route only/);
  assert.equal(engine.assess(record).score, 100);
  assert.equal(engine.assess({...record, source:''}).kind, 'incomplete');
  assert.equal(engine.examples.returnSimple.context, 'proposal');
  assert.match(engine.examples.returnSimple.source, /Author-constructed/);
});
test('a shown remote response counts as encountered, while an unseen change outside the encounter does not', () => {
  const remote = { ...engine.examples.action, title: 'Press a switch, then see a distant door open on a monitor', response: 'visible' };
  const result = engine.assess(remote);
  assert.equal(result.score, 100);
  assert.match(result.checks[0].reason, /visible remote response/);
  const unseen = engine.assess({ ...remote, response: 'elsewhere' });
  assert.equal(unseen.score, 0);
  assert.match(unseen.checks[0].reason, /outside the assessed encounter/);
  assert.match(unseen.checks[0].reason, /Location alone/);
});
test('unknowns produce bounds, not a guessed midpoint; blocked conditions collapse bounds', () => {
  assert.equal(engine.assess(engine.examples.unknown).display, '0–100');
  const unknownTime = engine.assess(scene({ cueSeconds: null }));
  assert.equal(unknownTime.kind, 'uncertain');
  assert.equal(unknownTime.score, null);
  assert.equal(unknownTime.display, '0–50');
  assert.equal(engine.assess(scene({ reference: 'missing', cueSeconds: null })).display, '0');
});
test('outward bounds retain fractional uncertainty and exact scores round once', () => {
  const uncertain = engine.assess(scene({ reference: 'unknown', windowSeconds: 3, cueStart: 0, cueSeconds: 1 }));
  assert.equal(uncertain.display, '0–34');
  assert.equal(engine.assess(scene({ reference: 'before', windowSeconds: 3, cueStart: 0, cueSeconds: 1 })).display, '33');
});
test('overlap is clamped and honors boundary arrival, partial durations and decimal inputs', () => {
  assert.equal(engine.assess(scene({ reference: 'before', cueStart: -7, cueSeconds: 7 })).score, 0);
  assert.equal(engine.assess(scene({ reference: 'before', cueStart: 10 })).score, 0);
  assert.equal(engine.assess(scene({ reference: 'before', cueStart: -5, cueSeconds: 30 })).score, 100);
  const result = engine.assess(scene({ reference: 'before', windowSeconds: 2.5, cueStart: 0.5, cueSeconds: 1.25 }));
  assert.equal(result.score, 50);
});
test('timing refines availability rather than applying a duplicate penalty', () => {
  assert.equal(engine.assess(scene({ availability: 'missing' })).score, 15);
  assert.equal(engine.assess(scene({ availability: '' })).score, 15);
  assert.equal(engine.assess(scene({ timed: false, availability: 'missing' })).score, 0);
});
test('blank and conditionally missing choices stay incomplete', () => {
  assert.equal(engine.assess(engine.blank()).kind, 'incomplete');
  for (const patch of [{ title: '' }, { move: '' }, { reference: '' }, { companion: '' }]) {
    assert.equal(engine.assess(scene(patch)).kind, 'incomplete');
  }
  assert.equal(engine.assess(scene({ timed: false, availability: '' })).kind, 'incomplete');
  assert.equal(engine.assess({ ...engine.examples.action, response: '' }).kind, 'incomplete');
  assert.equal(engine.assess({ ...engine.examples.sequence, order: '' }).kind, 'incomplete');
  const noRelationship = engine.assess({ ...engine.blank(), title: 'Just a room', move: 'arrive' });
  assert.equal(noRelationship.kind, 'incomplete');
  assert.equal(noRelationship.score, null);
  assert.match(noRelationship.missing[0], /relationship to assess/);
});
test('optional reference check displays known 50 coverage while situations remain 100 and zero', () => {
  const result = engine.assess(scene({ timed: false }));
  const reference = result.checks.find(item => item.id === 'reference');
  assert.equal(reference.low, 50);
  assert.equal(reference.high, 50);
  assert.deepEqual(result.scenarios.map(item => item.low), [100, 0]);
});
test('unresolved facts are actionable and survive a known zero from another requirement', () => {
  assert.match(engine.assess(engine.examples.unknown).missing[0], /earlier reference/);
  assert.match(engine.assess({ ...engine.examples.action, response: 'unknown' }).missing[0], /following the action/);
  assert.match(engine.assess({ ...engine.examples.sequence, order: 'unknown' }).missing[0], /first/);
  const blocked = engine.assess(scene({ reference: 'missing', cueStart: null, cueSeconds: null }));
  assert.equal(blocked.kind, 'complete');
  assert.equal(blocked.score, 0);
  assert.equal(blocked.missing.length, 2);
  assert.match(engine.report(scene({ reference: 'missing', cueStart: null, cueSeconds: null })), /## Unresolved facts/);
});
test('observation requires source while proposal does not invent one', () => {
  assert.equal(engine.assess(scene({ context: 'observation', source: '' })).kind, 'incomplete');
  assert.equal(engine.assess(scene({ context: 'proposal', source: '' })).kind, 'complete');
  assert.match(engine.report(scene({ context: 'observation', source: 'Work, release, sequence, 01:10–01:20' })), /documented observation/);
});
test('invalid types, ranges, fields, versions and incompatible timing are rejected', () => {
  for (const patch of [{ version: 0 }, { windowSeconds: 0 }, { windowSeconds: 301 }, { cueSeconds: -1 }, { cueStart: 301 }, { cueStart: -301 }, { cueStart: NaN }, { cueSeconds: Infinity }, { windowSeconds: '10' }, { timed: 1 }, { title: null }, { reference: 'likely' }, { surprise: true }, { relation: 'after' }]) {
    assert.equal(engine.assess(scene(patch)).kind, 'incomplete', JSON.stringify(patch));
    assert.ok(engine.validate(scene(patch)).errors.length, JSON.stringify(patch));
  }
  for (const value of [null, [], 'scene']) assert.ok(engine.validate(value).errors.length);
});
test('what-ifs retain meaning and the original two-situation denominator', () => {
  const record = scene();
  const snapshot = JSON.stringify(record);
  const alternatives = engine.whatIfs(record);
  assert.deepEqual(alternatives.map(item => item.id), ['timing', 'reference']);
  const reference = alternatives.find(item => item.id === 'reference');
  assert.equal(reference.changes.reference, 'here');
  assert.equal(reference.result.score, 30);
  assert.deepEqual(reference.result.scenarios.map(item => item.label), engine.assess(record).scenarios.map(item => item.label));
  assert.deepEqual(reference.result.scenarios.map(item => item.low), [30, 30]);
  for (const item of alternatives) {
    for (const key of ['title', 'reading', 'move', 'relation', 'companion']) assert.equal(Object.hasOwn(item.changes, key), false);
    assert.ok(item.gain > 0);
    assert.deepEqual(item.result, engine.compare(record, { ...record, ...item.changes }).after);
  }
  assert.equal(JSON.stringify(record), snapshot);
});
test('comparison holds situations fixed when a reference is supplied at the return', () => {
  const compared = engine.compare(scene(), scene({ reference: 'here' }));
  assert.equal(compared.comparable, true);
  assert.equal(compared.delta, 15);
  assert.deepEqual(compared.before.scenarios.map(item => item.label), compared.after.scenarios.map(item => item.label));
  const reversed = engine.compare(scene({ reference: 'here' }), scene());
  assert.equal(reversed.delta, -15);
  assert.equal(reversed.before.scenarios.length, 2);
});
test('optional versus guaranteed earlier visits change route premises without coercing the skipped situation', () => {
  for (const [before, after] of [[scene(), scene({ reference: 'before' })], [scene({ reference: 'before' }), scene()]]) {
    const result = engine.compare(before, after);
    assert.equal(result.comparable, false);
    assert.equal(result.delta, null);
    assert.match(result.reason, /different route premises/);
    assert.deepEqual(result.before, engine.assess(before));
    assert.deepEqual(result.after, engine.assess(after));
  }
});
test('comparison rejects changed meaning, source or unit and gives no scalar delta for unknowns', () => {
  for (const patch of [{ title: 'Different scene' }, { reading: 'Different meaning' }, { source: 'New footage' }, { context: 'observation' }, { windowSeconds: 11 }, { timed: false }]) {
    const compared = engine.compare(scene(), scene(patch));
    assert.equal(compared.comparable, false, JSON.stringify(patch));
    assert.equal(compared.delta, null);
  }
  const uncertain = engine.compare(scene(), scene({ cueSeconds: null }));
  assert.equal(uncertain.comparable, true);
  assert.equal(uncertain.delta, null);
  assert.equal(engine.compare(scene(), scene({ protectTiming: true })).delta, 0);
});
test('protected timing and unknowns do not receive speculative repair suggestions', () => {
  assert.ok(!engine.whatIfs(scene({ protectTiming: true })).some(item => item.id === 'timing'));
  assert.deepEqual(engine.whatIfs(engine.examples.unknown), []);
  assert.deepEqual(engine.whatIfs(scene({ reference: 'before', cueSeconds: null })), []);
  assert.deepEqual(engine.whatIfs(engine.blank()), []);
});
test('two absent requirements produce a concrete joint repair when neither single change helps', () => {
  const original = scene({ reference: 'missing', timed: false, availability: 'missing' });
  assert.equal(engine.assess({ ...original, reference: 'here' }).score, 0);
  assert.equal(engine.assess({ ...original, availability: 'present' }).score, 0);
  const alternatives = engine.whatIfs(original);
  assert.equal(alternatives.length, 1);
  assert.equal(alternatives[0].id, 'combined');
  assert.deepEqual(alternatives[0].changes, { reference: 'here', availability: 'present' });
  assert.equal(alternatives[0].result.score, 100);
  assert.equal(alternatives[0].gain, 100);
  assert.deepEqual(alternatives[0].result, engine.compare(original, { ...original, ...alternatives[0].changes }).after);
  const action = { ...engine.examples.action, response: 'none', relation: 'together', companion: 'The returning sound', availability: 'missing' };
  assert.deepEqual(engine.whatIfs(action)[0].changes, { response: 'visible', availability: 'present' });
});
test('joint repairs do not overwrite unknowns or protected timing', () => {
  assert.deepEqual(engine.whatIfs(scene({ reference: 'unknown', timed: false, availability: 'missing' })), []);
  const protectedScene = scene({ reference: 'missing', cueStart: -10, cueSeconds: 7, protectTiming: true });
  assert.deepEqual(engine.whatIfs(protectedScene), []);
  const result = engine.assess(protectedScene);
  assert.match(result.headline, /unavailable/);
  assert.match(result.reason, /absent/);
  const editable = { ...protectedScene, protectTiming: false };
  assert.deepEqual(engine.whatIfs(editable)[0].changes, { reference: 'here', cueStart: 0 });
});
test('decode round-trips drafts but rejects old formats and invalid shapes without mutation', () => {
  assert.deepEqual(engine.decode(JSON.stringify(engine.blank())), engine.blank());
  assert.deepEqual(engine.decode(JSON.stringify(scene())), scene());
  const original = scene();
  for (const content of ['broken', '{"version":0}', JSON.stringify({ version: 1, scene: 'old' }), JSON.stringify(scene({ windowSeconds: '10' })), JSON.stringify(scene({ extra: 2 }))]) {
    assert.throws(() => engine.decode(content));
  }
  assert.deepEqual(original, scene());
});
test('report separates input, inference, provenance and changed-premise comparisons', () => {
  const text = engine.report(scene({ reference: 'here' }), scene());
  assert.match(text, /Original: 15\/100\. Revised provision: 30\/100/);
  assert.match(text, /original set of described situations is held fixed/);
  assert.match(text, /author-designed operational convention/);
  assert.match(text, /not an equation derived from the cases/);
  assert.match(engine.report(scene({ reading: 'A different reading' }), scene()), /different premises/);
  assert.match(text, /reference: "optional" → "here"/);
  assert.match(text, /### Original supplied record/);
  const original = scene({ context: 'observation', source: 'Documented work and scene' });
  const observedRevision = engine.report({ ...original, reference: 'here' }, original);
  assert.match(observedRevision, /Evidence context: hypothetical revision of a documented observation/);
  assert.match(observedRevision, /does not substantiate the revision/);
  assert.match(observedRevision, /Earlier visit skipped: 30/);
});
test('full small input grid remains bounded and increasing overlap never lowers coverage', () => {
  for (const reference of ['before', 'here', 'optional', 'missing', 'unknown']) {
    for (const start of [-10, -4, 0, 4, 10]) {
      let priorLow = -1, priorHigh = -1;
      for (const duration of [1, 3, 7, 10, 20]) {
        const result = engine.assess(scene({ reference, cueStart: start, cueSeconds: duration }));
        assert.ok(result.low >= 0 && result.low <= result.high && result.high <= 100);
        assert.ok(result.low >= priorLow && result.high >= priorHigh);
        priorLow = result.low; priorHigh = result.high;
      }
    }
  }
});

test('late companion receives an improving timing comparison while intentional and unknown timing remain protected', () => {
  const original = { ...engine.blank(), title: 'Observatory arrival', move: 'arrive', relation: 'together', companion: 'Bell', availability: 'present', timed: true, windowSeconds: 12, cueStart: 9, cueSeconds: 6 };
  assert.equal(engine.assess(original).score, 25);
  const timing = engine.whatIfs(original).find(item => item.id === 'timing');
  assert.deepEqual(timing.changes, { cueStart: 0 });
  assert.equal(timing.result.score, 50);
  assert.equal(timing.gain, 25);
  assert.equal(original.cueStart, 9);
  for (const changes of [{ protectTiming: true }, { cueStart: null }, { cueStart: 0 }, { cueStart: 2, cueSeconds: 6 }]) {
    assert.ok(!engine.whatIfs({ ...original, ...changes }).some(item => item.id === 'timing'));
  }
});
