// ── Open / Close ──────────────────────────────────────────────────────────────
function openLE() {
  document.getElementById('le-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeLE() {
  document.getElementById('le-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

// ── State ─────────────────────────────────────────────────────────────────────
let _d=[], _f=[], _e=new Set(), _flt='all', _q='', _pg=1, _sel=-1;
let _reviewer = '';
let _syncTimer = null;
let _fname = 'labeled_data.csv';
const PS=50;

// ── Reviewer ──────────────────────────────────────────────────────────────────
function le_onRevSel(val) {
  const inp = document.getElementById('le-rv-inp');
  if (val === '__custom__') {
    inp.style.display = 'block';
    inp.focus();
    _reviewer = '';
  } else {
    inp.style.display = 'none';
    _reviewer = val;
    _syncReviewerHd();
  }
}
function le_setReviewer(val) { _reviewer = val.trim(); _syncReviewerHd(); }
function le_setReviewerHd(val) {
  if (val === '__custom__') {
    const name = prompt('Nhập tên người review:');
    if (name && name.trim()) {
      _reviewer = name.trim();
      document.getElementById('le-rv-hd').value = '';
    }
  } else {
    _reviewer = val;
  }
  _syncReviewerHd();
}
function _syncReviewerHd() {
  // Sync upload-zone select
  const sel = document.getElementById('le-rv-sel');
  if (sel) {
    const opt = Array.from(sel.options).find(o => o.value === _reviewer);
    if (opt) sel.value = _reviewer; else sel.value = '';
  }
  // Sync header select
  const hd = document.getElementById('le-rv-hd');
  if (hd) {
    const opt = Array.from(hd.options).find(o => o.value === _reviewer);
    if (opt) hd.value = _reviewer; else hd.value = '';
  }
}

function le_pickFile() {
  if (!_reviewer) {
    _toast('⚠️ Vui lòng chọn người review trước khi load file!');
    document.getElementById('le-rv-sel').focus();
    return;
  }
  document.getElementById('le-fi').click();
}

// ── Auto-sync helpers ─────────────────────────────────────────────────────────
function _setSyncStatus(state, msg) {
  const dot = document.getElementById('le-sync-dot');
  const txt = document.getElementById('le-sync-txt');
  if (!dot || !txt) return;
  dot.className = 'le-sync-dot ' + state; // idle | syncing | ok | error
  txt.textContent = msg || '';
}

function _scheduleSync() {
  _setSyncStatus('syncing', 'Đang chuẩn bị sync…');
  clearTimeout(_syncTimer);
  _syncTimer = setTimeout(le_syncNow, 2500);
}

async function le_syncNow() {
  clearTimeout(_syncTimer);
  if (!_d.length) { _toast('⚠️ Chưa có dữ liệu để sync'); return; }
  const rev = _reviewer || 'unknown';
  _setSyncStatus('syncing', `Đang sync…`);
  const out = _d.map(r => { const o={...r}; delete o._i; delete o._o; return o; });
  const csv = _csv(out);
  try {
    const res = await fetch('/sync_hf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csv, reviewer: rev, filename: _fname }),
    });
    const json = await res.json();
    if (json.status === 'ok') {
      _setSyncStatus('ok', `Synced ✓ (${rev})`);
      _toast(json.message);
    } else {
      _setSyncStatus('error', 'Sync lỗi!');
      _toast('❌ ' + json.message);
    }
  } catch(err) {
    _setSyncStatus('error', 'Sync lỗi!');
    _toast('❌ Lỗi kết nối: ' + err.message);
  }
}

// ── CSV ───────────────────────────────────────────────────────────────────────
function _pcsv(t){const L=t.split(/\r?\n/),H=_pl(L[0]),R=[];for(let i=1;i<L.length;i++){if(!L[i].trim())continue;const v=_pl(L[i]);if(v.length<H.length)continue;const o={};H.forEach((h,j)=>o[h.trim()]=(v[j]||'').trim());R.push(o);}return R;}
function _pl(l){const r=[];let c='',q=false;for(let i=0;i<l.length;i++){const ch=l[i];if(ch==='"'){if(q&&l[i+1]==='"'){c+='"';i++;}else q=!q;}else if(ch===','&&!q){r.push(c);c='';}else c+=ch;}r.push(c);return r;}
function _csv(d){const h=Object.keys(d[0]),e=v=>`"${String(v??'').replace(/"/g,'""')}"`;return[h.join(','),...d.map(r=>h.map(k=>e(r[k])).join(','))].join('\n');}

// ── File load ─────────────────────────────────────────────────────────────────
document.getElementById('le-fi').addEventListener('change',e=>_load(e.target.files[0]));
const dz=document.getElementById('le-dz');
dz.addEventListener('dragover',e=>{e.preventDefault();dz.style.borderColor='var(--le-accent)';});
dz.addEventListener('dragleave',()=>{dz.style.borderColor='var(--le-border)';});
dz.addEventListener('drop',e=>{
  e.preventDefault();dz.style.borderColor='var(--le-border)';
  if(!_reviewer){_toast('⚠️ Vui lòng chọn người review trước!');return;}
  _load(e.dataTransfer.files[0]);
});

function _load(file){
  if(!file)return;
  _fname = file.name;
  const r=new FileReader();
  r.onload=e=>{
    try{
      _d=_pcsv(e.target.result);
      _d.forEach((row,i)=>{
        row._i=i; row._o=row.sentiment;
        // Thêm cột reviewer nếu chưa có
        if(!row.reviewer) row.reviewer='';
      });
      _e.clear();_flt='all';_q='';_pg=1;_sel=-1;
      document.getElementById('le-fname').textContent=file.name;
      document.getElementById('le-up').style.display='none';
      document.getElementById('le-ed').style.display='flex';
      _syncReviewerHd();
      _setSyncStatus('idle','Chưa sync');
      _apply();
      _toast(`✅ Đã load ${_d.length.toLocaleString()} comments · reviewer: ${_reviewer||'(chưa chọn)'}`);
    }catch(err){_toast('❌ Lỗi: '+err.message);}
  };
  r.readAsText(file,'UTF-8');
}
function le_new(){document.getElementById('le-up').style.display='flex';document.getElementById('le-ed').style.display='none';document.getElementById('le-fi').value='';_setSyncStatus('idle','');}

// ── Filter ────────────────────────────────────────────────────────────────────
function le_filter(f,btn){_flt=f;_pg=1;document.querySelectorAll('.le-fb').forEach(b=>b.className='le-fb');if(f==='positive')btn.classList.add('ap');else if(f==='negative')btn.classList.add('an');else if(f==='neutral')btn.classList.add('au');else btn.classList.add('aa');_apply();}
function le_search(){_q=document.getElementById('le-q').value.toLowerCase();_pg=1;_apply();}
function _apply(){_f=_d.filter(r=>{const mf=_flt==='all'?true:_flt==='edited'?_e.has(r._i):r.sentiment===_flt;const ms=!_q||r.text.toLowerCase().includes(_q);return mf&&ms;});document.getElementById('le-rc').textContent=`${_f.length.toLocaleString()} kết quả`;_rt();_rp();_rs();}

// ── Stats ─────────────────────────────────────────────────────────────────────
function _rs(){document.getElementById('le-sp').textContent=_d.filter(r=>r.sentiment==='positive').length.toLocaleString();document.getElementById('le-sn').textContent=_d.filter(r=>r.sentiment==='negative').length.toLocaleString();document.getElementById('le-su').textContent=_d.filter(r=>r.sentiment==='neutral').length.toLocaleString();document.getElementById('le-se').textContent=_e.size.toLocaleString();document.getElementById('le-pf').style.width=(_d.length?_e.size/_d.length*100:0)+'%';}

// ── Table ─────────────────────────────────────────────────────────────────────
function _rt(){const s=((_pg-1)*PS),pg=_f.slice(s,s+PS);const hl=t=>{if(!_q)return _esc(t);const re=new RegExp(`(${_q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')})`,'gi');return _esc(t).replace(re,'<span class="le-hl">$1</span>');};document.getElementById('le-tb').innerHTML=pg.map((row,i)=>{const gi=s+i,ed=_e.has(row._i),sel=_sel===gi;return`<tr data-gi="${gi}" class="${sel?'le-sel':''}" onclick="_sr(${gi})"><td class="le-ti">${row._i+1}${ed?' <span style="color:var(--le-edited)">✎</span>':''}</td><td class="le-tt">${hl(row.text)}</td><td class="le-tg"><span class="le-gb">${row.sample_group||'—'}</span></td><td class="le-tl"><div class="le-ls"><span class="le-lb pos ${row.sentiment==='positive'?'on':''}" onclick="event.stopPropagation();_sl(${row._i},'positive',${gi})">POS</span><span class="le-lb neg ${row.sentiment==='negative'?'on':''}" onclick="event.stopPropagation();_sl(${row._i},'negative',${gi})">NEG</span><span class="le-lb neu ${row.sentiment==='neutral'?'on':''}" onclick="event.stopPropagation();_sl(${row._i},'neutral',${gi})">NEU</span></div></td></tr>`;}).join('');}
function _esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function _sl(i,label,gi){
  _d[i].sentiment=label;
  // Ghi reviewer + timestamp vào row
  _d[i].reviewer = _reviewer || 'unknown';
  _d[i].reviewed_at = new Date().toISOString().slice(0,19).replace('T',' ');
  if(label!==_d[i]._o)_e.add(i);else _e.delete(i);
  _apply();_sel=gi;_rt();
  const t=document.querySelector(`#le-tb tr[data-gi="${gi}"]`);
  if(t)t.classList.add('le-sel');
  // Auto-sync debounced
  _scheduleSync();
}
function _sr(gi){_sel=gi;document.querySelectorAll('#le-tb tr').forEach(t=>t.classList.remove('le-sel'));const t=document.querySelector(`#le-tb tr[data-gi="${gi}"]`);if(t)t.classList.add('le-sel');}

// ── Keyboard ──────────────────────────────────────────────────────────────────
document.addEventListener('keydown',e=>{if(!document.getElementById('le-overlay').classList.contains('open'))return;if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName))return;if(_sel===-1&&_f.length>0){_sel=0;_rt();return;}if(e.key==='ArrowDown'){e.preventDefault();if(_sel<_f.length-1){_sel++;if(_sel>=_pg*PS){_pg++;_rt();_rp();}else _rt();}}else if(e.key==='ArrowUp'){e.preventDefault();if(_sel>0){_sel--;if(_sel<(_pg-1)*PS){_pg--;_rt();_rp();}else _rt();}}else if((e.key==='p'||e.key==='P')&&_sel>=0&&_sel<_f.length)_sl(_f[_sel]._i,'positive',_sel);else if((e.key==='n'||e.key==='N')&&_sel>=0&&_sel<_f.length){_sl(_f[_sel]._i,'negative',_sel);_sel++;_rt();}else if((e.key==='u'||e.key==='U')&&_sel>=0&&_sel<_f.length){_sl(_f[_sel]._i,'neutral',_sel);_sel++;_rt();}});

// ── Pagination ────────────────────────────────────────────────────────────────
function _rp(){const tot=Math.ceil(_f.length/PS),pg=document.getElementById('le-pg');if(tot<=1){pg.innerHTML='';return;}let h=`<button class="le-pb" onclick="_gp(${_pg-1})" ${_pg===1?'disabled':''}>‹</button>`;const range=[];for(let i=1;i<=tot;i++){if(i===1||i===tot||Math.abs(i-_pg)<=2)range.push(i);else if(range[range.length-1]!=='…')range.push('…');}range.forEach(p=>{if(p==='…')h+=`<span class="le-pi">…</span>`;else h+=`<button class="le-pb ${p===_pg?'on':''}" onclick="_gp(${p})">${p}</button>`;});h+=`<button class="le-pb" onclick="_gp(${_pg+1})" ${_pg===tot?'disabled':''}>›</button>`;h+=`<span class="le-pi">${((_pg-1)*PS+1).toLocaleString()}–${Math.min(_pg*PS,_f.length).toLocaleString()} / ${_f.length.toLocaleString()}</span>`;pg.innerHTML=h;}
function _gp(p){const tot=Math.ceil(_f.length/PS);if(p<1||p>tot)return;_pg=p;_sel=(p-1)*PS;_rt();_rp();}

// ── Export ────────────────────────────────────────────────────────────────────
function le_export(){const out=_d.map(r=>{const o={...r};delete o._i;delete o._o;return o;});const csv=_csv(out);const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=_fname.replace('.csv','_reviewed.csv');a.click();URL.revokeObjectURL(url);_toast(`✅ Đã export ${_d.length.toLocaleString()} rows (${_e.size} edited)`);}

// ── Toast ─────────────────────────────────────────────────────────────────────
function _toast(msg){const t=document.getElementById('le-t');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2500);}

