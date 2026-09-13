(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SceneAssessment = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const VERSION = '1.0.2';
  const CONVENTION = 'encounter-coverage-1';
  const EPSILON = 1e-9;
  const ENUMS = {
    context: ['proposal', 'observation'], move: ['', 'arrive', 'return', 'act'],
    reference: ['', 'before', 'here', 'optional', 'missing', 'unknown'],
    response: ['', 'visible', 'elsewhere', 'none', 'unknown'],
    relation: ['none', 'together', 'after'],
    availability: ['', 'present', 'missing', 'unknown'],
    order: ['', 'follows', 'precedes', 'unknown']
  };
  const LABELS = {
    move: { arrive: 'Arrives in a scene', return: 'Returns to something changed', act: 'Acts and encounters a response' },
    reference: { before: 'Earlier reference encountered', here: 'Reference supplied here', optional: 'Earlier visit can be encountered or skipped', missing: 'Reference absent', unknown: 'Reference unknown' },
    response: { visible: 'Following change can be encountered after the action', elsewhere: 'Change is outside the assessed encounter', none: 'No following change is presented', unknown: 'Following presentation unknown' },
    relation: { none: 'No companion relationship specified', together: 'Together', after: 'One after another' },
    availability: { present: 'Companion present', missing: 'Companion missing', unknown: 'Companion availability unknown' },
    order: { follows: 'Companion follows', precedes: 'Companion comes first', unknown: 'Order unknown' }
  };

  function blank() {
    return { version: 1, context: 'proposal', source: '', title: '', reading: '', move: '',
      reference: '', response: '', companion: '', relation: 'none', availability: '',
      order: '', timed: false, windowSeconds: null, cueStart: null, cueSeconds: null,
      protectTiming: false };
  }

  function validate(record) {
    const errors = [], missing = [];
    if (!record || typeof record !== 'object' || Array.isArray(record)) {
      return { valid: false, missing, errors: ['A scene record must be an object.'] };
    }
    const template = blank();
    for (const key of Object.keys(record)) {
      if (!Object.prototype.hasOwnProperty.call(template, key)) errors.push('Unrecognized field: ' + key + '.');
    }
    for (const key of Object.keys(template)) {
      if (!Object.prototype.hasOwnProperty.call(record, key)) {
        errors.push('Missing record field: ' + key + '.');
        continue;
      }
      const value = record[key];
      if (key === 'version') {
        if (value !== 1) errors.push('Unsupported record version. Open a version 1 scene assessment.');
      } else if (['windowSeconds', 'cueStart', 'cueSeconds'].includes(key)) {
        if (value !== null && (typeof value !== 'number' || !Number.isFinite(value))) {
          errors.push(key + ' must be a finite number or null.');
        } else if (value !== null && (key === 'cueStart' ? value < -300 || value > 300 : value <= 0 || value > 300)) {
          errors.push(key + (key === 'cueStart' ? ' must be between -300 and 300 seconds.' : ' must be greater than 0 and at most 300 seconds.'));
        }
      } else if (typeof template[key] === 'boolean') {
        if (typeof value !== 'boolean') errors.push(key + ' must be true or false.');
      } else if (typeof value !== 'string') {
        errors.push(key + ' must be text.');
      } else if (ENUMS[key] && !ENUMS[key].includes(value)) {
        errors.push('Unrecognized ' + key + ' choice.');
      }
    }
    if (errors.length) return { valid: false, missing, errors };
    if (!record.title.trim()) missing.push('Name the scene or moment.');
    if (!record.move) missing.push('Choose what the player does.');
    if (record.move === 'arrive' && record.relation === 'none') missing.push('Add something that happens together with or after this moment so the tool has a relationship to assess.');
    if (record.context === 'observation' && !record.source.trim()) missing.push('Identify the observed source, version and scene.');
    if (record.move === 'return' && !record.reference) missing.push('Say where the earlier reference is available.');
    if (record.move === 'act' && !record.response) missing.push('Say where the following change is presented.');
    if (record.relation !== 'none' && !record.companion.trim()) missing.push('Name the other element or event.');
    if (record.relation === 'together' && !record.timed && !record.availability) missing.push('Say whether the other element is available together.');
    if (record.relation === 'after' && !record.order) missing.push('Say which event comes first.');
    if (record.timed && record.relation !== 'together') errors.push('Timing applies only to a together relationship.');
    return { valid: errors.length === 0 && missing.length === 0, missing, errors };
  }

  const clamp = value => Math.max(0, Math.min(1, value));
  const pair = value => [value, value];
  function referenceBounds(record) {
    if (record.move !== 'return') return pair(1);
    if (record.reference === 'unknown' || record.reference === 'optional') return [0, 1];
    return pair(record.reference === 'before' || record.reference === 'here' ? 1 : 0);
  }
  function responseBounds(record) {
    if (record.move !== 'act') return pair(1);
    return record.response === 'unknown' ? [0, 1] : pair(record.response === 'visible' ? 1 : 0);
  }
  function relationBounds(record) {
    if (record.relation === 'none') return pair(1);
    if (record.relation === 'after') return record.order === 'unknown' ? [0, 1] : pair(record.order === 'follows' ? 1 : 0);
    if (record.timed) {
      if ([record.windowSeconds, record.cueStart, record.cueSeconds].includes(null)) return [0, 1];
      const overlap = Math.min(record.windowSeconds, record.cueStart + record.cueSeconds) - Math.max(0, record.cueStart);
      return pair(clamp(overlap / record.windowSeconds));
    }
    return record.availability === 'unknown' ? [0, 1] : pair(record.availability === 'present' ? 1 : 0);
  }
  function check(id, label, bounds, reason) {
    return { id, label, low: bounds[0] * 100, high: bounds[1] * 100, reason };
  }
  function makeChecks(record) {
    const checks = [];
    if (record.move === 'return') {
      const reasons = {
        before: 'The earlier state and the changed state are available for comparison on the described encounter.',
        here: 'A reference supplied in the current scene makes the comparison available without an earlier visit.',
        optional: 'A return can include or omit the earlier reference. Both described situations are assessed; neither is assigned a probability.',
        missing: 'The changed scene is present, but the reference needed to recognize this change is absent. This does not erase other possible atmosphere.',
        unknown: 'Whether the earlier reference is available is unresolved; no midpoint is invented.'
      };
      checks.push(check('reference', 'Reference for the change', record.reference === 'optional' ? pair(0.5) : referenceBounds(record), reasons[record.reference]));
    }
    if (record.move === 'act') {
      const reasons = {
        visible: 'The action and its following presented change can both be encountered, including a visible remote response or a shown camera cut. Their presentation does not establish causation or experienced agency.',
        elsewhere: 'The following change is outside the assessed encounter, so its connection to the action is not presented there. Location alone would not establish this absence.',
        none: 'No following change is presented in the assessed encounter. Other meanings of the action remain outside this check.',
        unknown: 'The presentation following the action is unresolved. The engine cannot infer it from the action alone.'
      };
      checks.push(check('response', 'Following change available', responseBounds(record), reasons[record.response]));
    }
    if (record.relation !== 'none') {
      let reason;
      if (record.relation === 'after') {
        reason = record.order === 'follows' ? 'The two events occur in the stated order. No simultaneous overlap is required.' :
          record.order === 'precedes' ? 'The other event comes first, so the stated after relationship is not supplied.' :
          'The event order is unresolved; the engine does not assume a sequence.';
      } else if (record.timed) {
        reason = [record.windowSeconds, record.cueStart, record.cueSeconds].includes(null) ?
          'At least one timing is unknown, so overlap remains unresolved. Unknown timing is not treated as an absent event.' :
          'The supplied intervals overlap for ' + tidy(relationBounds(record)[0] * record.windowSeconds) +
          ' of the ' + tidy(record.windowSeconds) + '-second scene window. This replaces the qualitative availability check; it is not a second penalty.';
      } else {
        reason = record.availability === 'present' ? 'Both named elements are available together. Agreement in mood is not required: deliberate contrast is preserved.' :
          record.availability === 'missing' ? 'The other element is missing from the shared encounter, so this joint relationship is unavailable.' :
          'Whether both elements are available together is unresolved.';
      }
      checks.push(check('relation', record.relation === 'after' ? 'Sequence available' : 'Combination available', relationBounds(record), reason));
    }
    return checks;
  }
  function tidy(value) { return String(Number(value.toFixed(6))); }
  function unresolvedFacts(record) {
    const missing = [];
    if (record.move === 'return' && record.reference === 'unknown') missing.push('Check whether the earlier reference is available on this encounter.');
    if (record.move === 'act' && record.response === 'unknown') missing.push('Check where the change following the action is presented.');
    if (record.relation === 'after' && record.order === 'unknown') missing.push('Check which of the two events is encountered first.');
    if (record.relation === 'together' && !record.timed && record.availability === 'unknown') missing.push('Check whether the other element is available during the same encounter.');
    if (record.relation === 'together' && record.timed) {
      if (record.windowSeconds === null) missing.push('Check how long the assessed scene window lasts.');
      if (record.cueStart === null) missing.push('Check when the other element starts relative to arrival.');
      if (record.cueSeconds === null) missing.push('Check how long the other element lasts.');
    }
    return missing;
  }
  function scenarioDefinitions(record, options) {
    if (options && Array.isArray(options.referenceSituations) && options.referenceSituations.length) {
      return options.referenceSituations.map((entry, i) => typeof entry === 'string' ? {
        id: entry === 'Earlier visit skipped' ? 'reference-skipped' : entry === 'Earlier visit encountered' ? 'reference-met' : 'situation-' + i,
        label: entry
      } : { id: entry.id, label: entry.label });
    }
    if (record.move === 'return' && record.reference === 'optional') return [
      { id: 'reference-met', label: 'Earlier visit encountered' },
      { id: 'reference-skipped', label: 'Earlier visit skipped' }
    ];
    return [{ id: 'current', label: 'Described encounter' }];
  }

  function assess(record, options) {
    const validation = validate(record);
    if (!validation.valid) return { kind: 'incomplete', low: null, high: null, score: null, display: '—',
      scenarios: [], checks: [], headline: 'A few scene facts are still needed.',
      reason: validation.errors[0] || validation.missing[0], missing: validation.missing, errors: validation.errors, convention: CONVENTION };
    const r = referenceBounds(record), a = responseBounds(record), c = relationBounds(record);
    const scenarios = scenarioDefinitions(record, options).map(definition => {
      let reference = r;
      if (record.move === 'return' && record.reference === 'optional') {
        reference = definition.id === 'reference-met' ? pair(1) : definition.id === 'reference-skipped' ? pair(0) : [0, 1];
      }
      return { ...definition, low: 100 * reference[0] * a[0] * c[0], high: 100 * reference[1] * a[1] * c[1] };
    });
    const low = scenarios.reduce((sum, scenario) => sum + scenario.low, 0) / scenarios.length;
    const high = scenarios.reduce((sum, scenario) => sum + scenario.high, 0) / scenarios.length;
    const certain = Math.abs(high - low) < EPSILON;
    const checks = makeChecks(record);
    const display = certain ? String(Math.round((low + high) / 2)) :
      Math.floor(low + EPSILON) + '–' + Math.ceil(high - EPSILON);
    let headline = certain ? low >= 100 - EPSILON ? 'The stated connections are available.' :
      low <= EPSILON ? 'A needed connection is unavailable.' :
      'A connection is only partly available.' : 'A scene fact still needs checking.';
    let reason = 'The supplied facts support each connection checked here.';
    const limiting = checks.find(item => item.high <= EPSILON) || checks.find(item => item.low < 100 - EPSILON);
    if (record.move === 'return' && record.reference === 'optional' && high > EPSILON) {
      headline = 'The earlier visit can be skipped.';
      reason = 'Without an earlier view, the player has no reference for recognising what changed.';
      if (record.timed && [record.windowSeconds, record.cueStart, record.cueSeconds].every(value => value !== null) && c[0] < 1) {
        reason += ' The companion is also available for ' + tidy(c[0] * record.windowSeconds) + ' of ' + tidy(record.windowSeconds) + ' seconds.';
      }
    } else if (limiting) {
      if (limiting.id === 'reference') reason = record.reference === 'missing' ?
        'The earlier view is absent, so the player has no reference for recognising what changed.' :
        'Check whether the player encounters an earlier view of this place.';
      if (limiting.id === 'response') reason = record.response === 'elsewhere' ?
        'The following change is outside the encounter being examined.' : record.response === 'none' ?
        'No following change is presented in this encounter.' : 'Check where the change following the action is presented.';
      if (limiting.id === 'relation') {
        if (record.relation === 'after') reason = record.order === 'precedes' ?
          'The other event comes first, although this relationship needs it afterward.' : 'Check which event comes first.';
        else if (record.timed) reason = [record.windowSeconds, record.cueStart, record.cueSeconds].some(value => value === null) ?
          'Check the missing timing to see how much of the companion can be encountered.' :
          'The companion is available for ' + tidy(c[0] * record.windowSeconds) + ' of ' + tidy(record.windowSeconds) + ' seconds.';
        else reason = record.availability === 'missing' ?
          'The other element is missing, so the two cannot be encountered together.' : 'Check whether the two elements are available together.';
      }
    }
    return { kind: certain ? 'complete' : 'uncertain', low, high, score: certain ? (low + high) / 2 : null,
      display, scenarios, checks, headline, reason, missing: unresolvedFacts(record), errors: [], convention: CONVENTION };
  }

  function whatIfs(record) {
    const baseline = assess(record);
    if (baseline.kind === 'incomplete') return [];
    const candidates = [], concretePatches = [];
    const add = (id, title, detail, changes) => {
      const result = compare(record, { ...record, ...changes }).after;
      const gain = result.low - baseline.low;
      concretePatches.push({ id, title, detail, changes });
      if (gain > EPSILON) candidates.push({ id, title, detail, changes, result, gain });
    };
    if (record.move === 'return' && ['optional', 'missing'].includes(record.reference)) {
      add('reference', 'Show the earlier state at the return', 'If a reference to the earlier state is encountered here, the comparison can survive a skipped original visit. The declared reading is retained for the calculation; whether this revision serves it remains your judgment.', { reference: 'here' });
    }
    if (record.move === 'act' && ['elsewhere', 'none'].includes(record.response)) {
      add('response', 'Show the following change after the action', 'If the following change can be encountered after the action, their presented relationship can be examined. This can be a remote visible response; it need not occur at the same location. This does not establish causation or agency.', { response: 'visible' });
    }
    if (record.relation === 'together' && !record.timed && record.availability === 'missing') {
      add('companion', 'Make the companion available together', 'If both existing elements are encountered together, their declared relationship becomes available. The declared reading is retained for the calculation; whether this revision serves it remains your judgment.', { availability: 'present' });
    }
    if (record.relation === 'after' && record.order === 'precedes') {
      add('sequence', 'Present the companion afterward', 'If the other event follows, the ordering matches the relationship you described. This is a proposed arrangement, not an observed edit.', { order: 'follows' });
    }
    if (record.relation === 'together' && record.timed && !record.protectTiming &&
      [record.windowSeconds, record.cueStart, record.cueSeconds].every(value => value !== null) && record.cueStart < 0) {
      add('timing', 'Start the companion at arrival', 'If the same-duration event starts when the scene window begins, more of it may be encountered. Keep the original timing when its earlier start is intentional.', { cueStart: 0 });
    }
    if (!candidates.length && baseline.score !== null && baseline.score <= EPSILON && concretePatches.length > 1) {
      const changes = {};
      let compatible = true;
      for (const candidate of concretePatches) {
        for (const [key, value] of Object.entries(candidate.changes)) {
          if (Object.prototype.hasOwnProperty.call(changes, key) && changes[key] !== value) compatible = false;
          changes[key] = value;
        }
      }
      if (compatible) {
        const result = compare(record, { ...record, ...changes }).after;
        const gain = result.low - baseline.low;
        if (gain > EPSILON) candidates.push({ id: 'combined', title: 'Restore both missing connections',
          detail: 'Neither change alone restores the described relationship. Together: ' + concretePatches.map(candidate => candidate.title).join('; ') + '. The declared reading is held fixed for this comparison; whether the revision serves it remains your judgment.',
          changes, result, gain });
      }
    }
    return candidates.sort((first, second) => second.gain - first.gain);
  }

  function compare(before, after) {
    let original = assess(before), revised = assess(after);
    if (original.kind === 'incomplete' || revised.kind === 'incomplete') {
      return { before: original, after: revised, delta: null, comparable: false,
        reason: 'Complete the required scene facts before comparing.' };
    }
    const identity = ['title', 'reading', 'move', 'relation', 'companion', 'context', 'source', 'timed', 'windowSeconds'];
    if (identity.some(key => before[key] !== after[key])) {
      return { before: original, after: revised, delta: null, comparable: false,
        reason: 'The scene, interpretation, evidence context or assessment window changed. These are different premises, not a provision-only improvement.' };
    }
    if (before.move === 'return' && ((before.reference === 'optional' && after.reference === 'before') ||
      (before.reference === 'before' && after.reference === 'optional'))) {
      return { before: original, after: revised, delta: null, comparable: false,
        reason: 'Whether the earlier visit can be skipped changed. These are different route premises, so a fixed-situation improvement is not calculated. Supplying a reference at the return can instead be compared across the original situations.' };
    }
    const situations = before.move === 'return' && (before.reference === 'optional' || after.reference === 'optional') ?
      scenarioDefinitions({ ...before, reference: 'optional' }) : original.scenarios;
    original = assess(before, { referenceSituations: situations });
    revised = assess(after, { referenceSituations: situations });
    return { before: original, after: revised,
      delta: original.score === null || revised.score === null ? null : Math.round(revised.score) - Math.round(original.score),
      comparable: true,
      reason: 'The stated meaning and assessment window are unchanged. Both records use the same described situations; no likelihood is assigned to them.' };
  }

  function decode(text) {
    let record;
    try { record = JSON.parse(text); } catch (_) { throw new Error('This file is not valid JSON. The current scene has not been replaced.'); }
    if (!record || record.version !== 1 || !Object.prototype.hasOwnProperty.call(record, 'move')) {
      throw new Error('This is not a version 1 scene assessment. Older toolkit records are preserved separately and are not converted by guessing.');
    }
    const result = validate(record);
    if (result.errors.length) throw new Error('Cannot open this scene: ' + result.errors.join(' '));
    return { ...record };
  }

  function quote(value) { return String(value || '(not supplied)').split(/\r?\n/).map(line => '> ' + line).join('\n'); }
  function report(record, before) {
    const comparison = before ? compare(before, record) : null;
    const result = comparison && comparison.comparable ? comparison.after : assess(record);
    const changedFields = before ? Object.keys(blank()).filter(key => before[key] !== record[key]) : [];
    const hypotheticalObservationRevision = before && before.context === 'observation' && changedFields.length > 0;
    const lines = ['# Scene assessment', '', 'Engine: ' + VERSION, 'Convention: ' + CONVENTION,
      'Evidence context: ' + (hypotheticalObservationRevision ? 'hypothetical revision of a documented observation; revised values are not observed evidence' : record.context === 'observation' ? 'documented observation' : 'constructed or proposed scene'),
      '', '## Supplied facts', '', 'Scene:', quote(record.title), '', 'Reading or intention (supplied, not inferred):', quote(record.reading),
      '', hypotheticalObservationRevision ? 'Baseline source / provenance (does not substantiate the revision):' : 'Source / provenance:', quote(record.source), '', 'Player situation: ' + (LABELS.move[record.move] || '(not supplied)')];
    if (record.move === 'return') lines.push('Reference: ' + (LABELS.reference[record.reference] || '(not supplied)'));
    if (record.move === 'act') lines.push('Following presentation: ' + (LABELS.response[record.response] || '(not supplied)'));
    lines.push('Relationship: ' + (LABELS.relation[record.relation] || '(not supplied)'));
    if (record.relation !== 'none') lines.push('Companion:', quote(record.companion));
    if (record.relation === 'together' && !record.timed) lines.push('Availability: ' + (LABELS.availability[record.availability] || '(not supplied)'));
    if (record.relation === 'after') lines.push('Order: ' + (LABELS.order[record.order] || '(not supplied)'));
    if (record.timed) lines.push('Scene window: ' + (record.windowSeconds === null ? 'unknown' : record.windowSeconds + ' seconds'),
      'Companion starts relative to arrival: ' + (record.cueStart === null ? 'unknown' : record.cueStart + ' seconds'),
      'Companion duration: ' + (record.cueSeconds === null ? 'unknown' : record.cueSeconds + ' seconds'),
      'Preserve the current timing: ' + (record.protectTiming ? 'yes' : 'no'));
    lines.push('', '## Computed signal', '', result.display + '/100', '', result.headline, '', result.reason);
    for (const item of result.checks) lines.push('', item.label + ': ' + tidy(item.low) + (item.low === item.high ? '' : '–' + tidy(item.high)), item.reason);
    for (const scenario of result.scenarios) lines.push('', scenario.label + ': ' + tidy(scenario.low) + (scenario.low === scenario.high ? '' : '–' + tidy(scenario.high)));
    if (result.kind === 'incomplete') lines.push('', ...result.missing, ...result.errors);
    else if (result.missing.length) lines.push('', '## Unresolved facts', '', ...result.missing);
    if (before) {
      lines.push('', '## Comparison');
      if (!comparison.comparable) {
        lines.push('', comparison.reason);
      } else {
        lines.push('', 'Original: ' + comparison.before.display + '/100. Revised provision: ' + comparison.after.display + '/100.',
          'The original set of described situations is held fixed. A changed observation is a proposal until separately observed.');
      }
      lines.push('', '### Changed fields', '');
      if (!changedFields.length) lines.push('No supplied values changed.');
      for (const key of changedFields) lines.push(key + ': ' + JSON.stringify(before[key]) + ' → ' + JSON.stringify(record[key]));
      lines.push('', '### Original supplied record', '', 'The following is the original input record, not a cached result:', '', '```json', JSON.stringify(before, null, 2), '```');
    }
    lines.push('', '## Interpretation limits', '',
      'The human supplies scene identity, facts and meaning. The engine derives reference, response, co-presence and sequence requirements from those facts. It does not interpret arbitrary prose.',
      'Coverage is an author-designed operational convention, not an equation derived from the cases, measured atmosphere, a probability, a universal quality threshold or proof of player response.',
      'Optional reference situations are equally weighted test situations, not observed frequencies. Unknowns bound the index; they are not assigned a midpoint. Complete presentation does not prove attention, understanding, causation or agency.',
      'Proposals are not observations. Identified sources remain necessary for documented analysis. More cues or repeated copies do not add points.', '');
    return lines.join('\n');
  }

  const examples = {
    returnSimple: { ...blank(), title: 'A familiar room after the farewell', reading: 'The room feels changed after spending time together.', move: 'return', reference: 'optional', companion: 'The cheerful tune', relation: 'together', availability: 'present', source: 'Author-constructed demonstration; not game or participant evidence.' },
    return: { ...blank(), title: 'A familiar room after the farewell', reading: 'The room feels changed after spending time together.', move: 'return', reference: 'optional', companion: 'The cheerful tune', relation: 'together', availability: 'present', timed: true, windowSeconds: 10, cueStart: -4, cueSeconds: 7, source: 'Author-constructed demonstration; not game or participant evidence.' },
    contrast: { ...blank(), title: 'Cheerful music in an empty room', reading: 'Warmth with something unresolved.', move: 'arrive', companion: 'The cheerful tune against the empty room', relation: 'together', availability: 'present', source: 'Author-constructed demonstration; not game or participant evidence.' },
    action: { ...blank(), context: 'observation', title: 'Life is Strange: the final choice and its presented consequence', reading: 'The selected action is followed by a farewell, temporal return, montage and funeral. Coverage does not establish grief, closure or felt agency.', move: 'act', response: 'visible', source: 'LIS-AV-002. Life is Strange (Dontnod Entertainment, 2015), original pre-remaster recording; platform, patch and build unknown. KnightWalkthroughHD, LIFE IS STRANGE FULL GAME | NoCommentary | Gameplay Walkthrough (2019-06-16), 10:25:27–10:34:50, selected Sacrifice Chloe route only. https://www.youtube.com/watch?v=qYnhpWf20So&t=37527s . Thesis close-viewing: 2026-08-30. No measured cue timing or player-response evidence.' },
    sequence: { ...blank(), title: 'Silence, then a familiar melody', reading: 'The melody arrives after the quiet interval.', move: 'arrive', companion: 'The melody', relation: 'after', order: 'follows', source: 'Author-constructed demonstration; not game or participant evidence.' },
    unknown: { ...blank(), title: 'A room with an uncertain earlier visit', reading: 'A changed place may be recognized.', move: 'return', reference: 'unknown', source: 'Author-constructed demonstration with deliberately missing information.' }
  };
  for (const example of Object.values(examples)) Object.freeze(example);
  Object.freeze(examples);
  return { VERSION, CONVENTION, blank, validate, assess, compare, whatIfs, report, decode, examples };
});
