(function () {
  'use strict';
  const E = window.SceneAssessment;
  const byId = id => document.getElementById(id);
  const clone = value => JSON.parse(JSON.stringify(value));
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const numeric = ['windowSeconds', 'cueStart', 'cueSeconds'];
  const boolean = ['timed', 'protectTiming'];
  const sliderIds = {windowSeconds:'window-slider', cueStart:'start-slider', cueSeconds:'duration-slider'};
  const form = byId('scene-form'), output = byId('result');
  let scene = E.blank(), before = null, previewTitle = '', provenance = '', undo = null, suggestions = [];
  const exampleNames = {returnSimple:'An empty room on returning',contrast:'Cheerful music, an empty room',action:'Life is Strange: choice and consequence',sequence:'Silence, then a melody',return:'A brief tune that starts early',unknown:'A reference we have not checked'};
  for (const [key, text] of Object.entries(exampleNames)) {
    const option = document.createElement('option'); option.value = key; option.textContent = text; byId('example').appendChild(option);
  }
  const announce = text => { byId('notice').textContent = text; };
  const signature = () => JSON.stringify({scene,before,previewTitle,provenance});
  function remember() { undo = {scene:clone(scene),before:before?clone(before):null,previewTitle,provenance}; }
  function restoreControls() {
    for (const key of Object.keys(E.blank())) {
      const input = byId(key); if (!input) continue;
      if (boolean.includes(key)) input.checked = scene[key];
      else input.value = scene[key] ?? '';
    }
    for (const key of numeric) updateSlider(key);
  }
  function updateSlider(key) {
    const el = byId(sliderIds[key]);
    if (scene[key] !== null && Number.isFinite(scene[key])) {
      el.min = String(Math.min(Number(el.min),scene[key]));
      el.max = String(Math.max(Number(el.max),scene[key]));
      el.value = String(scene[key]);
      el.setAttribute('aria-valuetext', scene[key] + ' seconds');
    } else el.setAttribute('aria-valuetext','Not supplied; move to enter a value');
  }
  function showFields() {
    byId('reference-fields').hidden = scene.move !== 'return';
    byId('response-fields').hidden = scene.move !== 'act';
    byId('companion-fields').hidden = scene.relation === 'none';
    byId('together-fields').hidden = scene.relation !== 'together';
    byId('order-fields').hidden = scene.relation !== 'after';
    byId('timing-fields').hidden = !scene.timed;
    byId('availability-fields').hidden = scene.timed;
    byId('context-badge').textContent = before ? 'Comparison preview' : scene.context === 'observation' ? 'Documented encounter' : 'Proposed scene';
  }
  function boundText(item) {
    return Math.abs(item.high-item.low)<1e-8 ? String(Math.round(item.low)) : Math.floor(item.low+1e-8)+'–'+Math.ceil(item.high-1e-8);
  }
  function resultDetails(result) {
    return `<details class="result-details"><summary>Why this result?</summary>${result.checks.map(item=>`<p><strong>${escape(item.label)}.</strong> ${escape(item.reason)}</p>`).join('')}<ul>${result.scenarios.map(item=>`<li>${escape(item.label)}: <strong>${boundText(item)}/100</strong></li>`).join('')}</ul><p>Necessary conditions must hold together within each described situation. Situations receive equal weight, not a likelihood. Timing, when supplied, measures the share of the stated window with joint availability.</p><p>More coverage is not automatically a better artistic choice. Short appearances, missed references and contrasting elements can be intentional.</p></details>`;
  }
  function renderResult() {
    showFields();
    const comparison = before ? E.compare(before,scene) : null;
    const result = comparison ? comparison.after : E.assess(scene);
    byId('compact-score').textContent=result.kind==='incomplete'?'Add the scene facts':result.display+' / 100';
    byId('save-scene').setAttribute('aria-disabled',String(E.validate(scene).errors.length > 0));
    if (result.kind === 'incomplete') {
      suggestions=[];
      output.innerHTML=`<div class="empty-result"><p class="result-eyebrow">Scene → requirements → signal</p><h2 id="result-heading">${scene.title?'One more part of the scene':'Start with your moment'}</h2><p>${scene.title?'The engine needs the following concrete facts to assess this relationship.':'Name a moment and choose what the player does. Relevant questions appear here as you work.'}</p>${result.errors.length?`<div class="errors" role="alert">${result.errors.map(escape).join('<br>')}</div>`:''}${scene.title||scene.move?`<ul>${result.missing.map(item=>`<li>${escape(item)}</li>`).join('')}</ul>`:''}<p class="scope">You supply scene facts. The toolkit derives what must be encountered together, in order, or with an earlier reference.</p></div>`;
      prepareExports();return;
    }
    suggestions = before ? [] : E.whatIfs(scene);
    const best = suggestions[0];
    const delta = comparison && comparison.delta !== null ? (comparison.delta>0?'+':'')+comparison.delta : null;
    output.innerHTML=`${before?`<span class="preview-label">Hypothetical comparison · ${escape(previewTitle)}</span>`:''}<p class="result-eyebrow">${before&&before.context==='observation'?'Proposed change to the documented encounter':scene.context==='observation'?'From your documented facts':'From your proposed scene'}</p><h2 id="result-heading">Encounter coverage</h2><div class="score-line"><span class="score">${escape(result.display)}</span><span class="score-unit">/ 100</span></div><p class="score-caption">Coverage of the situations and time you described</p>${comparison?`<p class="delta">${escape(comparison.before.display)} → ${escape(comparison.after.display)}${delta!==null?` <strong>(${delta} points)</strong>`:''}</p>`:''}<h3 class="result-title">${escape(result.headline)}</h3><p class="result-reason">${escape(result.reason)}</p>${result.checks.map(item=>`<div class="check-row"><div><strong>${escape(item.label)}</strong><span class="value">${boundText(item)}/100</span></div><div class="track" aria-hidden="true"><span class="upper" style="width:${item.high}%"></span><span class="lower" style="width:${item.low}%"></span></div></div>`).join('')}${result.missing.length?`<p class="hint"><strong>Still unknown:</strong> ${result.missing.map(escape).join(' ')}</p>`:''}${best?`<div class="compare-box"><h3>Try one concrete change</h3><button data-action="preview" data-id="${escape(best.id)}">${escape(best.title)} →</button><p>Preview ${escape(result.display)} → ${escape(best.result.display)}. The original stays available.</p>${suggestions.length>1?`<details><summary>Other comparisons</summary>${suggestions.slice(1).map(item=>`<button class="quiet" data-action="preview" data-id="${escape(item.id)}">${escape(item.title)} · ${escape(item.result.display)}/100</button>`).join('')}</details>`:''}</div>`:!before&&result.kind==='complete'?`<p class="hint">${scene.protectTiming?'The protected timing is retained.':'No further supported change is identified from these facts.'} You can edit the scene to explore another possibility.</p>`:''}${before?`<div class="comparison-actions"><button type="button" data-action="keep">Keep this version</button><button type="button" class="secondary" data-action="restore">Back to original</button></div><p class="hint">${escape(comparison.reason)} ${before.context==='observation'?'Keeping this version creates a proposal; it does not change the documented encounter.':''}</p>`:''}${scene.reading?`<p class="result-reading">${escape(scene.reading)}</p>`:''}${resultDetails(result)}<div class="result-actions"><a class="quiet" data-download="report">Save result${before?' & comparison':''}</a><a class="quiet" data-download="work">Save editable work</a></div>`;
    prepareExports();
  }
  function render() { restoreControls(); renderResult(); }
  function clearComparisonOnEdit(key) {
    if (!before) {
      if(scene.context==='observation'&&!['context','reading'].includes(key)){
        scene.context='proposal';byId('context').value='proposal';
        announce('Changed facts are treated as a proposal. Select documented encounter again only after checking them against the source.');
      }
      return;
    }
    if (before.context==='observation') { scene.context='proposal'; byId('context').value='proposal'; }
    before=null; previewTitle='';
    announce('The edited version is now the working proposal. The previous comparison can be recovered with Undo.');
  }
  function onInput(event) {
    const el=event.target;
    if(el.dataset.number) {
      remember(); clearComparisonOnEdit(el.dataset.number);
      const key=el.dataset.number;scene[key]=Number(el.value);byId(key).value=String(scene[key]);updateSlider(key);renderResult();return;
    }
    const key=el.name;if(!Object.hasOwn(scene,key))return;
    remember();clearComparisonOnEdit(key);
    scene[key]=boolean.includes(key)?el.checked:numeric.includes(key)?(el.value===''?null:Number(el.value)):el.value;
    if(key==='relation'&&scene.relation!=='together'){scene.timed=false;byId('timed').checked=false;}
    if(numeric.includes(key))updateSlider(key);
    renderResult();
  }
  form.addEventListener('input',onInput);
  byId('jump-result').addEventListener('click',()=>byId('result-panel').scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'}));
  form.addEventListener('submit',event=>event.preventDefault());
  byId('example').addEventListener('change',event=>{
    if(!E.examples[event.target.value])return;
    remember();scene=clone(E.examples[event.target.value]);before=null;previewTitle='';
    const documented=scene.context==='observation';
    provenance=documented?'Documented thesis example LIS-AV-002; source and limits retained in scene record.':'Author-constructed example';
    render();announce(documented?'Documented Life is Strange example loaded. Source and limits are under Your reading and evidence. Changing its facts creates a proposal; Undo restores the record.':'Constructed example loaded. Every value is editable. Your previous work can be recovered with Undo.');
  });
  byId('new-scene').addEventListener('click',()=>{
    remember();scene=E.blank();before=null;previewTitle='';provenance='';byId('example').value='';render();announce('A blank scene is ready. Undo restores the previous work.');byId('title').focus();
  });
  // A single, always available undo protects clear/example/import and the last input edit.
  const undoButton=document.createElement('button');undoButton.type='button';undoButton.id='undo';undoButton.className='quiet';undoButton.textContent='Undo';
  document.querySelector('.file-tools').appendChild(undoButton);
  undoButton.addEventListener('click',()=>{
    if(!undo){announce('No earlier edit to restore.');return;}
    const current={scene:clone(scene),before:before?clone(before):null,previewTitle,provenance};
    ({scene,before,previewTitle,provenance}=clone(undo));undo=current;render();announce('Previous work restored.');
  });
  const basename=()=> (scene.title.trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,65)||'scene')+'-assessment';
  function prepareExports() {
    if(E.validate(scene).errors.length){
      for(const link of document.querySelectorAll('[data-download]'))link.removeAttribute('href');
    } else {
      const payload={format:'beyond-words-assessment',version:1,scene,before,previewTitle,provenance};
      const workUrl='data:application/json;charset=utf-8,'+encodeURIComponent(JSON.stringify(payload,null,2)+'\n');
      for(const link of document.querySelectorAll('[data-download="work"]')){link.href=workUrl;link.download=basename()+'.json';}
      const reportLinks=document.querySelectorAll('[data-download="report"]');
      if(reportLinks.length){
        const reportUrl='data:text/markdown;charset=utf-8,'+encodeURIComponent(E.report(scene,before));
        for(const link of reportLinks){link.href=reportUrl;link.download=basename()+'.md';}
      }
    }
  }
  document.addEventListener('click',event=>{
    const link=event.target.closest('[data-download]');if(!link)return;
    if(!link.hasAttribute('href')){event.preventDefault();announce('Correct the invalid values before saving.');}
    else announce('Download requested. Check your browser’s downloads before closing.');
  });
  byId('open-scene').addEventListener('click',()=>{byId('file-input').value='';byId('file-input').click();});
  byId('file-input').addEventListener('change',async event=>{
    const file=event.target.files[0];if(!file)return;
    const atStart=signature();
    try {
      if(file.size>1_000_000)throw new Error('Choose a scene file smaller than 1 MB.');
      const text=await file.text();let parsed;try{parsed=JSON.parse(text);}catch(_){throw new Error('This is not a valid JSON scene file.');}
      let candidate,newBefore=null,newTitle='',newProvenance='';
      if(parsed&&parsed.format==='beyond-words-assessment') {
        if(parsed.version!==1||Object.keys(parsed).some(key=>!['format','version','scene','before','previewTitle','provenance'].includes(key)))throw new Error('This scene file uses an unsupported format.');
        candidate=E.decode(JSON.stringify(parsed.scene));
        if(parsed.before!==null&&parsed.before!==undefined)newBefore=E.decode(JSON.stringify(parsed.before));
        if(typeof parsed.previewTitle!=='string'||typeof parsed.provenance!=='string')throw new Error('The scene file contains invalid comparison information.');
        newTitle=parsed.previewTitle;newProvenance=parsed.provenance;
        if(newBefore&&!E.compare(newBefore,candidate).comparable)throw new Error('The saved comparison changes its meaning or scope. Open the scene without claiming a comparable result.');
      } else candidate=E.decode(text);
      if(signature()!==atStart)throw new Error('Your work changed while the file was opening. Open it again when you are ready to replace the current scene.');
      remember();scene=candidate;before=newBefore;previewTitle=newTitle;provenance=newProvenance;byId('example').value='';render();announce('Saved work opened. Scores were recalculated from its facts. Undo restores the previous work.');
    }catch(error){announce(error.message+' Current work has been kept.');}
  });
  output.addEventListener('click',event=>{
    const button=event.target.closest('[data-action]');if(!button)return;
    if(button.dataset.action==='preview') {
      const choice=suggestions.find(item=>item.id===button.dataset.id);if(!choice)return;
      remember();before=clone(scene);scene={...scene,...choice.changes};previewTitle=choice.title;render();announce(choice.detail);
    } else if(button.dataset.action==='restore') {
      if(!before)return;remember();scene=clone(before);before=null;previewTitle='';render();announce('The original scene is restored.');
    } else if(button.dataset.action==='keep') {
      remember();
      if(before&&before.context==='observation'){scene.context='proposal';provenance='Hypothetical revision based on the documented source.';}
      before=null;previewTitle='';render();announce('This version is now your working proposal. Save it to keep the editable record.');
    }
  });
  render();
})();
