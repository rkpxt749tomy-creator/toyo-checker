// ---------- Tabs ----------
document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    window.scrollTo({ top: 0, behavior: 'instant' });
  });
});

// ---------- localStorage helpers ----------
const LS = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { localStorage.setItem(k, JSON.stringify(v)); },
};

// ============================================================
// 体質チェック
// ============================================================
const checkState = LS.get('check', {}); // {kikyo: Set of indices}

function renderCheck() {
  const root = document.getElementById('checkList');
  root.innerHTML = TAISHITSU.map(t => {
    const checked = new Set(checkState[t.id] || []);
    const total = t.checks.length;
    const count = checked.size;
    const items = t.checks.map((c, i) => {
      const on = checked.has(i) ? 'on' : '';
      return `<label class="chip ${on}" data-tid="${t.id}" data-idx="${i}"><input type="checkbox" ${on?'checked':''} hidden>${c}</label>`;
    }).join('');
    return `
    <details class="card" ${count>0?'open':''}>
      <summary><b>${t.name}</b><span class="kana">（${t.kana}）</span>
        <span class="badge ${count>=5?'hot':''}">${count}/${total}</span>
      </summary>
      <p class="lead">${t.summary}</p>
      <div class="chips">${items}</div>
    </details>`;
  }).join('');

  root.querySelectorAll('.chip').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      const tid = el.dataset.tid, idx = parseInt(el.dataset.idx, 10);
      const set = new Set(checkState[tid] || []);
      set.has(idx) ? set.delete(idx) : set.add(idx);
      checkState[tid] = [...set];
      LS.set('check', checkState);
      renderCheck(); // re-render badge
      renderCheckResult();
    });
  });
  renderCheckResult();
}

function renderCheckResult() {
  const ranked = TAISHITSU.map(t => ({
    name: t.name, id: t.id, count: (checkState[t.id] || []).length, total: t.checks.length,
    summary: t.summary, care: t.care, tsubo: t.tsubo,
  })).filter(r => r.count >= 1).sort((a,b) => b.count - a.count);

  const box = document.getElementById('checkResult');
  if (!ranked.length) { box.hidden = true; return; }
  box.hidden = false;
  box.innerHTML = `
    <h3>候補体質</h3>
    <ul class="rank">
      ${ranked.slice(0,3).map((r,i) => `
        <li>
          <div class="rank-head"><span class="medal">${i+1}</span><b>${r.name}</b>
            <span class="badge ${r.count>=5?'hot':''}">${r.count}/${r.total}</span></div>
          <p class="lead">${r.summary}</p>
          <div><b>ツボ:</b>${tsuboHtml(r.tsubo)}</div>
          <p><b>セルフケア:</b> ${r.care.slice(0,3).join(' / ')}</p>
        </li>`).join('')}
    </ul>
    ${ranked.length > 1 ? `<p class="note">※ 複合体質が一般的です。上位2〜3つを組み合わせて見ます。</p>` : ''}
  `;
}

document.getElementById('resetCheck').addEventListener('click', () => {
  if (!confirm('体質チェックをクリアしますか?')) return;
  for (const k in checkState) delete checkState[k];
  LS.set('check', checkState);
  renderCheck();
});

// ============================================================
// 症状辞典（逆引き内蔵）
// ============================================================
function renderDict(filter = '') {
  const f = filter.trim();
  const rev = document.getElementById('dictReverse');
  const list = document.getElementById('dictList');

  // 逆引き
  const revMatched = REVERSE.map(g => ({
    ...g,
    items: g.items.filter(x => !f || x.sym.includes(f) || x.cand.includes(f) || g.group.includes(f))
  })).filter(g => g.items.length);

  rev.innerHTML = `<details class="card" ${f?'open':''}>
    <summary><b>症状 → 候補体質（逆引き）</b><span class="badge">${REVERSE.reduce((s,g)=>s+g.items.length,0)}</span></summary>
    ${revMatched.map(g => `
      <div class="rev-group">
        <h4>${g.group}</h4>
        <table class="rev"><tbody>
          ${g.items.map(x => `<tr><td>${highlight(x.sym, f)}</td><td>${highlight(x.cand, f)}</td></tr>`).join('')}
        </tbody></table>
      </div>`).join('')}
  </details>`;

  // 症状辞典
  const matched = SYMPTOMS.filter(s => !f || s.name.includes(f) || s.cat.includes(f) ||
    (s.organ||[]).some(x=>x.includes(f)) || (s.emotion||[]).some(x=>x.includes(f)) ||
    (s.life||[]).some(x=>x.includes(f)) || (s.memo||'').includes(f));

  // カテゴリでグルーピング
  const byCat = {};
  matched.forEach(s => { (byCat[s.cat] = byCat[s.cat] || []).push(s); });

  list.innerHTML = Object.keys(byCat).map(cat => `
    <h3 class="cat-head">${cat}</h3>
    ${byCat[cat].map(s => `
      <details class="card sym" ${f?'open':''}>
        <summary><b>${highlight(s.name, f)}</b><span class="lead">${s.lead}</span></summary>
        <div class="sym-grid">
          <section><h5>内臓・身体</h5><ul>${(s.organ||[]).map(x=>`<li>${highlight(x,f)}</li>`).join('')}</ul></section>
          <section><h5>感情</h5><ul>${(s.emotion||[]).map(x=>`<li>${highlight(x,f)}</li>`).join('')}</ul></section>
          <section><h5>生活習慣</h5><ul>${(s.life||[]).map(x=>`<li>${highlight(x,f)}</li>`).join('')}</ul></section>
          ${s.structure ? `<section><h5>構造・姿勢</h5><ul>${s.structure.map(x=>`<li>${highlight(x,f)}</li>`).join('')}</ul></section>`:''}
        </div>
        <blockquote class="memo">${highlight(s.memo, f)}</blockquote>
      </details>`).join('')}
  `).join('') || `<p class="note">該当なし</p>`;
}

function highlight(text, term) {
  if (!term) return escapeHtml(text);
  const t = escapeHtml(text);
  const re = new RegExp(escapeReg(term), 'g');
  return t.replace(re, m => `<mark>${m}</mark>`);
}
function escapeHtml(s){return s.replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function escapeReg(s){return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');}

function tsuboHtml(str) {
  return `<ul class="tsubo-list">${str.split(/[・、]/).map(n => {
    const name = n.trim();
    const loc = TSUBO_INFO[name];
    return `<li><b>${escapeHtml(name)}</b>${loc ? `<span class="tsubo-loc">${escapeHtml(loc)}</span>` : ''}</li>`;
  }).join('')}</ul>`;
}

document.getElementById('dictSearch').addEventListener('input', e => renderDict(e.target.value));

// ============================================================
// 体質一覧
// ============================================================
function renderRef(filter = '') {
  const f = filter.trim();
  const root = document.getElementById('refList');
  const matched = TAISHITSU.filter(t => !f || t.name.includes(f) || t.kana.includes(f) || t.summary.includes(f) || t.memo.includes(f));
  root.innerHTML = matched.map(t => `
    <details class="card" ${f?'open':''}>
      <summary><b>${highlight(t.name,f)}</b><span class="kana">（${t.kana}）</span></summary>
      <p class="lead">${highlight(t.summary,f)}</p>
      <div class="ref-grid">
        <div><h5>舌診</h5><p>${t.tongue}</p></div>
        <div><h5>よくある主訴</h5><ul>${t.chief.map(x=>`<li>${x}</li>`).join('')}</ul></div>
        <div><h5>合う食事</h5><p>${t.food_ok}</p></div>
        <div><h5>合わない食事</h5><p>${t.food_ng}</p></div>
        <div><h5>セルフケア</h5><ul>${t.care.map(x=>`<li>${x}</li>`).join('')}</ul></div>
        <div><h5>ツボ</h5>${tsuboHtml(t.tsubo)}</div>
      </div>
      <blockquote class="memo">${highlight(t.memo,f)}</blockquote>
    </details>`).join('') || `<p class="note">該当なし</p>`;
}
document.getElementById('refSearch').addEventListener('input', e => renderRef(e.target.value));

// ============================================================
// 問診シート
// ============================================================
const intakeState = LS.get('intake', {});

function renderIntake() {
  const root = document.getElementById('intakeList');
  root.innerHTML = INTAKE.map(sec => `
    <details class="card" open>
      <summary><b>${sec.sec}</b></summary>
      ${sec.q.map(q => renderQuestion(q)).join('')}
    </details>`).join('');

  // bind events
  root.querySelectorAll('[data-qkey]').forEach(el => {
    el.addEventListener('click', e => {
      const key = el.dataset.qkey, type = el.dataset.qtype, val = el.dataset.qval;
      if (type === 'radio') {
        intakeState[key] = (intakeState[key] === val) ? null : val;
      } else if (type === 'multi') {
        const set = new Set(intakeState[key] || []);
        set.has(val) ? set.delete(val) : set.add(val);
        intakeState[key] = [...set];
      } else if (type === 'scale') {
        intakeState[key] = parseInt(val, 10);
      }
      LS.set('intake', intakeState);
      renderIntake();
    });
  });

  renderIntakeResult();
}

function renderQuestion(q) {
  if (q.type === 'scale') {
    const cur = intakeState[q.key] || 0;
    const cells = Array.from({length:q.max}, (_,i) => {
      const v = i+1;
      return `<button class="scale-cell ${cur>=v?'on':''}" data-qkey="${q.key}" data-qtype="scale" data-qval="${v}">${v}</button>`;
    }).join('');
    return `<div class="q"><label>${q.label}</label><div class="scale">${cells}</div></div>`;
  }
  const sel = intakeState[q.key];
  const cells = q.opts.map(o => {
    const on = q.type === 'radio' ? (sel === o) : (Array.isArray(sel) && sel.includes(o));
    return `<label class="chip ${on?'on':''}" data-qkey="${q.key}" data-qtype="${q.type}" data-qval="${escapeHtml(o)}">${o}</label>`;
  }).join('');
  return `<div class="q"><label>${q.label}</label><div class="chips">${cells}</div></div>`;
}

function renderIntakeResult() {
  const hints = [];
  INTAKE.forEach(sec => sec.q.forEach(q => {
    if (!q.hints) return;
    const v = intakeState[q.key];
    if (Array.isArray(v)) v.forEach(x => { if (q.hints[x]) hints.push({sec:sec.sec, q:q.label, ans:x, hint:q.hints[x]}); });
    else if (typeof v === 'string' && q.hints[v]) hints.push({sec:sec.sec, q:q.label, ans:v, hint:q.hints[v]});
  }));
  // scale-based hints
  const stress = intakeState['F1_レベル']; if (stress >= 7) hints.push({sec:'F. ストレス', q:'ストレスレベル', ans:String(stress), hint:'高ストレス。副腎・自律神経・横隔膜を優先で見る'});
  const cold = intakeState['E1_強さ']; if (cold >= 7) hints.push({sec:'E. 冷え', q:'冷えの強さ', ans:String(cold), hint:'強い冷え。陽虚・腎虚・脾虚を疑う'});
  const sleep = intakeState['B2_寝つき']; if (sleep && sleep <= 4) hints.push({sec:'B. 睡眠', q:'寝つきの悪さ', ans:String(sleep), hint:'交感神経優位、肝の高ぶり'});

  // ---- 体質スコア計算 ----
  const scores = {};
  TAISHITSU.forEach(t => scores[t.id] = 0);
  INTAKE.forEach(sec => sec.q.forEach(q => {
    const v = intakeState[q.key]; if (!v) return;
    const vals = Array.isArray(v) ? v : [v];
    vals.forEach(x => {
      const m = SCORE_MAP[`${q.key}:${x}`];
      if (m) for (const id in m) scores[id] = (scores[id]||0) + m[id];
    });
  }));
  SCORE_SCALE.forEach(rule => {
    const v = intakeState[rule.key];
    if (rule.th != null && v >= rule.th) for (const id in rule.score) scores[id] += rule.score[id];
    if (rule.max != null && v && v <= rule.max) for (const id in rule.score) scores[id] += rule.score[id];
  });
  const ranked = Object.entries(scores)
    .filter(([,s]) => s >= 2)
    .sort((a,b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id, s]) => {
      const t = TAISHITSU.find(x => x.id === id);
      const c = CARE_TAISHITSU.find(x => x.name === t.name);
      return {id, name:t.name, kana:t.kana, summary:t.summary, score:s, tsubo:t.tsubo, care:c};
    });

  const box = document.getElementById('intakeResult');
  if (!hints.length && !ranked.length) { box.hidden = true; return; }
  box.hidden = false;
  box.innerHTML = `
    ${hints.length ? `
      <h3>見立てヒント</h3>
      <ul class="hint-list">
        ${hints.map(h => `<li><span class="tag">${h.sec}</span><b>${h.ans}</b> → ${h.hint}</li>`).join('')}
      </ul>` : ''}
    ${ranked.length ? `
      <h3 style="margin-top:14px;">候補体質</h3>
      <ul class="rank">
        ${ranked.map((r,i) => `
          <li>
            <div class="rank-head"><span class="medal">${i+1}</span><b>${r.name}</b>
              <span class="kana">（${r.kana}）</span>
              <span class="badge ${r.score>=4?'hot':''}">${r.score}点</span></div>
            <p class="lead">${r.summary}</p>
            <div><b>ツボ:</b>${tsuboHtml(r.tsubo)}</div>
          </li>`).join('')}
      </ul>
      <h3 style="margin-top:14px;">この人へのセルフケア（一番効く1個）</h3>
      <ul class="rank">
        ${ranked.map(r => r.care ? `
          <li>
            <div class="rank-head"><b>${r.name}</b><span class="kana">に向けて</span></div>
            <p><b>★ ${r.care.best}</b></p>
            <p class="note">${r.care.why}</p>
            <details style="margin-top:6px;">
              <summary class="hint">その他のセルフケアを見る</summary>
              <ul class="care-list" style="margin:6px 0 0;">${r.care.list.map(l=>`<li>${l}</li>`).join('')}</ul>
            </details>
          </li>` : '').join('')}
      </ul>
      <p class="note">※ 複合体質が一般的。上位2〜3つを組み合わせて見ます</p>
    ` : ''}
  `;
}

document.getElementById('resetIntake').addEventListener('click', () => {
  if (!confirm('問診をクリアしますか?')) return;
  for (const k in intakeState) delete intakeState[k];
  LS.set('intake', intakeState);
  renderIntake();
});

// ============================================================
// セルフケア
// ============================================================
let careSeg = 'taishitsu';
let careFilter = '';

function renderCare() {
  const root = document.getElementById('careList');
  const f = careFilter.trim();
  const hl = (t) => highlight(t, f);

  if (careSeg === 'taishitsu') {
    const list = CARE_TAISHITSU.filter(x => !f || x.name.includes(f) || x.sub.includes(f) || x.aim.includes(f) || x.list.some(l=>l.includes(f)) || x.best.includes(f));
    root.innerHTML = list.map(x => `
      <details class="card" ${f?'open':''}>
        <summary><b>${hl(x.name)}</b><span class="kana">${hl(x.sub)}</span></summary>
        <p class="lead"><b>狙い：</b>${hl(x.aim)}</p>
        <ul class="care-list">${x.list.map(l=>`<li>${hl(l)}</li>`).join('')}</ul>
        <blockquote class="memo"><b>一番効く1個：</b>${hl(x.best)}<br><span class="note">${hl(x.why)}</span></blockquote>
      </details>`).join('') || `<p class="note">該当なし</p>`;
  } else if (careSeg === 'type') {
    const list = CARE_TYPE.filter(x => !f || x.name.includes(f) || x.signs.includes(f) || x.list.some(l=>l.includes(f)) || x.best.includes(f));
    root.innerHTML = list.map(x => `
      <details class="card" ${f?'open':''}>
        <summary><b>${hl(x.name)}</b></summary>
        <p class="lead"><b>見分け方：</b>${hl(x.signs)}</p>
        <ul class="care-list">${x.list.map(l=>`<li>${hl(l)}</li>`).join('')}</ul>
        <blockquote class="memo"><b>一番効く1個：</b>${hl(x.best)}<br><span class="note">${hl(x.why)}</span></blockquote>
      </details>`).join('') || `<p class="note">該当なし</p>`;
  } else if (careSeg === 'scene') {
    const list = CARE_SCENE.map(g => ({
      ...g,
      items: g.items.filter(x => !f || x.do.includes(f) || x.eff.includes(f) || x.tgt.includes(f) || g.scene.includes(f))
    })).filter(g => g.items.length);
    root.innerHTML = list.map(g => `
      <details class="card" open>
        <summary><b>${g.scene}</b><span class="badge">${g.items.length}</span></summary>
        <table class="rev"><thead><tr><th>行動</th><th>効果</th><th>対象</th></tr></thead><tbody>
          ${g.items.map(x => `<tr><td>${hl(x.do)}</td><td>${hl(x.eff)}</td><td>${hl(x.tgt)}</td></tr>`).join('')}
        </tbody></table>
      </details>`).join('') || `<p class="note">該当なし</p>`;
  } else if (careSeg === 'howto') {
    const h = CARE_HOWTO;
    root.innerHTML = `
      <details class="card" open>
        <summary><b>鉄則</b></summary>
        <ul class="care-list">${h.rules.map(x=>`<li>${hl(x)}</li>`).join('')}</ul>
      </details>
      <details class="card" open>
        <summary><b>効くフレーズ ◯</b></summary>
        ${h.ok.map(x => `<div class="q"><label>${hl(x.t)}</label><blockquote class="memo">${hl(x.s)}</blockquote></div>`).join('')}
      </details>
      <details class="card">
        <summary><b>避けるフレーズ ✗</b></summary>
        ${h.ng.map(x => `<div class="q"><label>${hl(x.t)}</label><blockquote class="memo">${hl(x.s)}</blockquote></div>`).join('')}
      </details>
      <details class="card">
        <summary><b>渡し方フロー</b></summary>
        ${h.flow.map(x => `<div class="q"><label>${hl(x.step)}</label><blockquote class="memo">${hl(x.s)}</blockquote></div>`).join('')}
      </details>
      <details class="card">
        <summary><b>続けるための工夫</b></summary>
        ${h.tips.map(x => `<div class="q"><label>${hl(x.t)}</label><blockquote class="memo">${hl(x.s)}</blockquote></div>`).join('')}
      </details>`;
  }
}

document.querySelectorAll('#careSeg .seg-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#careSeg .seg-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    careSeg = btn.dataset.seg;
    renderCare();
  });
});
document.getElementById('careSearch').addEventListener('input', e => { careFilter = e.target.value; renderCare(); });

// ---------- init ----------
renderIntake();
renderCheck();
renderDict();
renderRef();
renderCare();
