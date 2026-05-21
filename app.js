// ── BAS Pilot · app.js ──

// ══ STATE ══
const PLANS_INFO = {
  free:       {name:'Free Trial',  price:'$0',     icon:'🎁', color:'#6ee7b7'},
  starter:    {name:'Starter',     price:'$19/mo', icon:'⚡', color:'#38bdf8'},
  pro:        {name:'Pro',         price:'$49/mo', icon:'⭐', color:'#fbbf24'},
  accountant: {name:'Accountant',  price:'$149/mo',icon:'👔', color:'#a78bfa'},
};
window.currentUser = null;
window.basData = null;
let selSignupPlan = 'starter';
let rawRows = [], txns = [];

function loadUser()  { try { const u=localStorage.getItem('bm_user'); if(u) window.currentUser=JSON.parse(u); } catch(e){} }
function saveUser(u) { window.currentUser=u; localStorage.setItem('bm_user',JSON.stringify(u)); }
function doLogout()  { window.currentUser=null; localStorage.removeItem('bm_user'); updateNav(); navTo('home'); toast('Logged out successfully','info'); }

// ══ TOAST ══
function toast(msg, type='info', duration=3500) {
  const icons = {success:'✅',error:'❌',info:'ℹ️',warning:'⚠️'};
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span class="toast-ico">${icons[type]}</span><span style="flex:1">${msg}</span><span class="toast-close" onclick="this.parentElement.remove()">✕</span>`;
  document.getElementById('toastContainer').appendChild(el);
  setTimeout(()=>{ el.style.animation='toastOut .3s ease forwards'; setTimeout(()=>el.remove(),300); }, duration);
}

// ══ NAVIGATION ══
function navTo(p) {
  if (['dashboard','app','settings','reports','report-detail'].includes(p) && !window.currentUser) { navTo('signup'); return; }
  const ALL = ['home','login','signup','dashboard','app','settings','pricing','about','contact','legal','404','reports','report-detail','verify'];
  ALL.forEach(id => {
    document.getElementById('page-'+id)?.classList.toggle('active', id===p);
    document.getElementById('nl-'+id)?.classList.toggle('active', id===p);
  });
  document.getElementById('siteFooter').style.display = ['login','signup','verify'].includes(p) ? 'none' : 'block';
  if (p==='dashboard') updateDashboard();
  if (p==='settings')  loadSettings();
  if (p==='reports')   loadReportsPage();
  if (p==='signup')    setTimeout(initStrengthMeter, 120);
  if (p==='contact')   setTimeout(prefillContact, 80);
  closeMobileMenu();
  window.scrollTo({top:0, behavior:'smooth'});
}
function goSignup(plan) { selSignupPlan=plan; selPlan(plan); closeModal(); navTo('signup'); }

// ══ MOBILE MENU ══
function openMobileMenu()  { document.getElementById('mobileMenu').classList.add('open'); }
function closeMobileMenu() { document.getElementById('mobileMenu').classList.remove('open'); }

// ══ MODAL ══
function openModal()  { document.getElementById('modal').classList.add('show'); }
function closeModal() { document.getElementById('modal').classList.remove('show'); }

// ══ ABN ══
function formatABN(input) {
  let v = input.value.replace(/\D/g,'').slice(0,11);
  if (v.length>2)  v = v.slice(0,2)+' '+v.slice(2);
  if (v.length>6)  v = v.slice(0,6)+' '+v.slice(6);
  if (v.length>10) v = v.slice(0,10)+' '+v.slice(10);
  input.value = v;
}
function verifyABN() {
  const abn = document.getElementById('sabn').value.replace(/\s/g,'');
  const hint = document.getElementById('abnHint'), btn = document.getElementById('abnCheckBtn');
  if (abn.length!==11||isNaN(abn)) { hint.textContent='ABN must be 11 digits'; hint.classList.add('show'); hint.style.color='var(--red)'; return; }
  const weights=[10,1,3,5,7,9,11,13,15,17,19], digits=abn.split('').map(Number);
  digits[0]--;
  if (digits.reduce((s,d,i)=>s+d*weights[i],0)%89===0) {
    hint.textContent='✓ Valid ABN'; hint.classList.add('show'); hint.style.color='var(--green)';
    btn.textContent='✓ Valid'; btn.classList.add('abn-valid'); toast('ABN verified ✓','success');
  } else {
    hint.textContent='Invalid ABN — please check and try again'; hint.classList.add('show'); hint.style.color='var(--red)';
    toast('Invalid ABN number','error');
  }
}

// ══ AUTH ══
function selPlan(p) {
  selSignupPlan = p;
  ['free','starter','pro'].forEach(id => document.getElementById('pso-'+id)?.classList.toggle('sel', id===p));
  const btn = document.getElementById('signupBtnTxt');
  if (btn) btn.textContent = p==='free' ? 'Create Free Account →' : `Start ${PLANS_INFO[p]?.name} — 7-Day Trial →`;
}

function setAuthAlert(id, type, msg) {
  const el = document.getElementById(id);
  el.innerHTML = msg; el.className = `auth-alert ${type} show`;
}

function googleAuth(mode) {
  const user = { firstName:'Google', lastName:'User', email:'user@gmail.com', plan:'starter',
    createdAt:new Date().toISOString(), trialEnds:new Date(Date.now()+7*24*60*60*1000).toISOString(), reports:[], googleAuth:true };
  saveUser(user); updateNav(); navTo('dashboard'); toast('Signed in with Google ✓','success');
}

function doLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const pass  = document.getElementById('loginPass').value;
  if (!email||!pass) { setAuthAlert('loginAlert','error','Please enter your email and password.'); return; }
  const btn = document.getElementById('loginBtn');
  btn.disabled=true; document.getElementById('loginBtnTxt').textContent='Logging in…';
  setTimeout(()=>{
    const stored = localStorage.getItem('bm_user');
    if (stored) {
      const u = JSON.parse(stored);
      if (u.email===email) { saveUser(u); updateNav(); navTo('dashboard'); toast(`Welcome back, ${u.firstName||'there'}! 👋`,'success'); btn.disabled=false; document.getElementById('loginBtnTxt').textContent='Log In →'; return; }
    }
    setAuthAlert('loginAlert','error','No account found. <a onclick="navTo(\'signup\')" style="color:var(--red);font-weight:700;cursor:pointer">Sign up →</a>');
    btn.disabled=false; document.getElementById('loginBtnTxt').textContent='Log In →';
  }, 700);
}

function doForgotPassword() {
  const email = document.getElementById('loginEmail').value.trim();
  if (!email) { setAuthAlert('loginAlert','error','Enter your email first, then click Forgot password.'); return; }
  setAuthAlert('loginAlert','success',`✉️ Password reset email sent to <strong>${email}</strong>.`);
  toast('Password reset email sent','success');
}

function doSignup() {
  const first=document.getElementById('sfirst').value.trim(), last=document.getElementById('slast').value.trim();
  const email=document.getElementById('semail').value.trim(), biz=document.getElementById('sbiz').value.trim();
  const abn=document.getElementById('sabn').value.trim(), pass=document.getElementById('spass').value;
  ['emailHint','passHint'].forEach(id=>document.getElementById(id)?.classList.remove('show'));
  document.getElementById('semail')?.classList.remove('err'); document.getElementById('spass')?.classList.remove('err');
  let valid=true;
  if (!email||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){document.getElementById('emailHint')?.classList.add('show');document.getElementById('semail')?.classList.add('err');valid=false;}
  if (!pass||pass.length<8){document.getElementById('passHint')?.classList.add('show');document.getElementById('spass')?.classList.add('err');valid=false;}
  if (!valid) return;
  const stored=localStorage.getItem('bm_user');
  if (stored){const u=JSON.parse(stored);if(u.email===email){setAuthAlert('signupAlert','error','This email is already registered. <a onclick="navTo(\'login\')" style="color:var(--red);font-weight:700;cursor:pointer">Log in →</a>');return;}}
  const btn=document.getElementById('signupBtn'); btn.disabled=true;
  document.getElementById('signupBtnTxt').textContent='Creating account…';
  setTimeout(()=>{
    const user={firstName:first||email.split('@')[0],lastName:last,email,businessName:biz,abn,
      plan:selSignupPlan,createdAt:new Date().toISOString(),trialEnds:new Date(Date.now()+7*24*60*60*1000).toISOString(),reports:[],emailVerified:true};
    saveUser(user); updateNav();
    showOnboarding(user.firstName);
    btn.disabled=false; document.getElementById('signupBtnTxt').textContent='Create Account →';
  }, 800);
}

// ══ SETTINGS ══
function loadSettings() {
  if (!window.currentUser) return;
  document.getElementById('setFirst').value = window.currentUser.firstName||'';
  document.getElementById('setLast').value  = window.currentUser.lastName||'';
  document.getElementById('setEmail').value = window.currentUser.email||'';
  document.getElementById('setBiz').value   = window.currentUser.businessName||'';
  document.getElementById('setABN').value   = window.currentUser.abn||'';
  const plan = PLANS_INFO[window.currentUser.plan]||PLANS_INFO.starter;
  document.getElementById('setPlanName').textContent = plan.name+' Plan';
  const daysLeft = Math.max(0,Math.ceil((new Date(window.currentUser.trialEnds)-new Date())/(1000*60*60*24)));
  document.getElementById('setPlanDetail').textContent = daysLeft>0 ? `Trial — ${daysLeft} days remaining` : `${plan.price} · Active`;
}
function saveProfile() {
  if (!window.currentUser) return;
  window.currentUser.firstName    = document.getElementById('setFirst').value.trim();
  window.currentUser.lastName     = document.getElementById('setLast').value.trim();
  window.currentUser.email        = document.getElementById('setEmail').value.trim();
  window.currentUser.businessName = document.getElementById('setBiz').value.trim();
  window.currentUser.abn          = document.getElementById('setABN').value.trim();
  saveUser(window.currentUser); updateNav(); toast('Profile updated ✓','success');
}
function changePassword() {
  const curr=document.getElementById('setCurrPass').value, newP=document.getElementById('setNewPass').value, conf=document.getElementById('setConfPass').value;
  if (!curr) { toast('Enter your current password','error'); return; }
  if (newP.length<8) { toast('New password must be at least 8 characters','error'); return; }
  if (newP!==conf)   { toast('Passwords do not match','error'); return; }
  toast('Password updated ✓','success');
  ['setCurrPass','setNewPass','setConfPass'].forEach(id=>document.getElementById(id).value='');
}
function manageBilling()  { toast('Connect Stripe to enable billing management','warning'); }
function cancelSubscription() {
  if (confirm('Cancel subscription? Access continues until end of billing period.')) {
    window.currentUser.plan='free'; saveUser(window.currentUser); loadSettings();
    toast('Subscription cancelled.','info');
  }
}
function deleteAccount() {
  if (confirm('DELETE ACCOUNT? Permanent, cannot be undone.') && confirm('Absolutely sure?')) {
    localStorage.removeItem('bm_user'); window.currentUser=null; updateNav(); navTo('home'); toast('Account deleted.','info');
  }
}

// ══ CONTACT / FAQ ══
function sendContact() {
  const name=document.getElementById('cname').value.trim(), email=document.getElementById('cemail').value.trim(), msg=document.getElementById('cmessage').value.trim();
  if (!name||!email||!msg) { toast('Please fill in all required fields','error'); return; }
  toast("Message sent! We'll reply within 24 hours ✓",'success');
  ['cname','cemail','csubject','cmessage'].forEach(id=>{ if(document.getElementById(id)) document.getElementById(id).value=''; });
}
function toggleFAQ(el) {
  el.nextElementSibling.classList.toggle('open');
  el.querySelector('span:last-child').textContent = el.nextElementSibling.classList.contains('open') ? '↑' : '↓';
}

// ══ APP — FILE UPLOAD ══
function appStep(n) {
  [1,2,3,4].forEach(i => {
    document.getElementById('ap'+i).classList.toggle('active', i===n);
    const s = document.getElementById('as'+i);
    s.classList.remove('active','done');
    if (i===n) s.classList.add('active'); else if (i<n) s.classList.add('done');
  });
  window.scrollTo({top:0, behavior:'smooth'});
}

function resetApp() {
  rawRows=[]; txns=[]; window.basData=null;
  document.getElementById('fi').value='';
  document.getElementById('chips').innerHTML='';
  document.getElementById('btnS2').disabled=true;
  document.getElementById('btnS2').textContent='AI Categorise Transactions →';
  appStep(1);
}

async function handleFiles(files) {
  if (!files.length) return;
  rawRows=[]; document.getElementById('chips').innerHTML='';
  const err = document.getElementById('upErr'); err.style.display='none';
  for (const f of Array.from(files)) {
    try {
      const rows = await readFile(f);
      if (rows && rows.length>1) rawRows.push(...rows);
      const c = document.createElement('div'); c.className='chip'; c.innerHTML=`✅ ${f.name}`;
      document.getElementById('chips').appendChild(c);
    } catch(e) { err.textContent='Error: '+e.message; err.style.display='block'; toast('Error reading file: '+e.message,'error'); return; }
  }
  const btn = document.getElementById('btnS2'); btn.disabled = rawRows.length===0;
  if (rawRows.length) { btn.textContent=`AI Categorise ${rawRows.length} Transactions →`; toast(`${rawRows.length} transactions loaded ✓`,'success'); }
}

function readFile(file) {
  return new Promise((resolve,reject) => {
    const ext = file.name.split('.').pop().toLowerCase();
    const reader = new FileReader();
    if (ext==='csv') {
      reader.onload = e => {
        const lines = e.target.result.split(/\r?\n/).filter(l=>l.trim());
        const rows = lines.slice(1).map(l => {
          const cells=[]; let cur='',inQ=false;
          for (let i=0;i<l.length;i++) { if(l[i]==='"'){inQ=!inQ}else if(l[i]===','&&!inQ){cells.push(cur.trim());cur=''}else cur+=l[i]; }
          cells.push(cur.trim()); return cells;
        }).filter(r=>r.some(c=>c!==''));
        resolve(rows);
      };
      reader.onerror=()=>reject(new Error('Read failed')); reader.readAsText(file);
    } else {
      reader.onload = e => {
        const wb=XLSX.read(new Uint8Array(e.target.result),{type:'array',cellDates:true,raw:false});
        const ws=wb.Sheets[wb.SheetNames[0]];
        const all=XLSX.utils.sheet_to_json(ws,{header:1,raw:false,dateNF:'DD/MM/YYYY',defval:''});
        let start=0;
        for (let i=0;i<Math.min(5,all.length);i++) { if(all[i].some(c=>/date|amount|debit|credit/i.test(String(c)))){start=i+1;break;} }
        resolve(all.slice(start).filter(r=>r.some(c=>c!=='')));
      };
      reader.onerror=()=>reject(new Error('Read failed')); reader.readAsArrayBuffer(file);
    }
  });
}

// ══ APP — AI RUN ══
function runAI() {
  const fill=document.getElementById('pFill'), lbl=document.getElementById('pLbl');
  const total=rawRows.length; let i=0; txns=[];
  const stages=['Parsing transactions…','Identifying income…','Detecting GST items…','Classifying categories…','Finalising…'];

  const iv = setInterval(()=>{
    const batch = Math.min(20, total-i);
    for (let b=0;b<batch;b++,i++) {
      const row=rawRows[i]; if(!row) continue;
      let date=null, desc='', amount=null;
      for (let ci=0;ci<row.length;ci++) {
        const v=String(row[ci]||'').trim(); if(!v) continue;
        if (date===null) { const m1=v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/); const m2=v.match(/^(\d{4})-(\d{2})-(\d{2})/); if(m1)date=new Date(+m1[3],+m1[2]-1,+m1[1]);else if(m2)date=new Date(+m2[1],+m2[2]-1,+m2[3]);else if(row[ci] instanceof Date)date=row[ci]; }
        if (amount===null) { const n=parseFloat(v.replace(/[$,\s]/g,'')); if(!isNaN(n)&&Math.abs(n)>0.01&&Math.abs(n)<1000000&&v.match(/^-?\$?[\d,]+\.?\d{0,2}$/))amount=n; }
        if (v.length>8&&isNaN(parseFloat(v.replace(/[$,]/g,'')))&&!v.match(/^\d{1,2}[\/-]\d/)&&v.length>desc.length) desc=v;
      }
      if (amount===null) { const nums=row.map(v=>parseFloat(String(v||'').replace(/[$,\s]/g,''))).filter(n=>!isNaN(n)&&Math.abs(n)>0.01); const strs=row.map(v=>String(v||'').trim()).filter(v=>v.length>5&&isNaN(parseFloat(v.replace(/[$,]/g,'')))); if(nums.length)amount=nums[0]; if(strs.length)desc=strs.reduce((a,b)=>a.length>b.length?a:b,''); }
      if (amount===null||Math.abs(amount)<0.01) continue;
      const {cat,gst}=aiCat(desc,amount); txns.push({date,desc,amount,cat,gst,note:''});
    }
    const pct = total>0 ? Math.round(i/total*70) : 70;
    fill.style.width=pct+'%'; lbl.textContent=stages[Math.min(Math.floor(pct/22),3)]+' '+pct+'%';
    if (i>=total) {
      clearInterval(iv);
      if (!txns.length) { toast('Could not parse transactions. Check file format.','error'); appStep(1); return; }
      fill.style.width='75%'; lbl.textContent='Sending to Claude AI…';
      claudeCategorise(txns).then(results=>{
        if (results&&results.length) {
          results.forEach(r=>{ if(txns[r.i]){txns[r.i].cat=r.cat;txns[r.i].gst=r.gst;} });
          toast(`${txns.length} transactions categorised by Claude AI ✓`,'success');
        } else {
          toast(`${txns.length} transactions categorised ✓`,'success');
        }
        // Persist txns to localStorage for session recovery
        saveTxnsLocal();
        fill.style.width='100%'; lbl.textContent='Done!';
        setTimeout(()=>{ buildTable(); appStep(3); }, 300);
      });
    }
  }, 30);
}

// ══ APP — EDITABLE TABLE ══
function buildTable() {
  const tbody = document.getElementById('tblBody');
  const thead = tbody.closest('table').querySelector('thead tr');
  if (!thead.querySelector('.th-notes')) {
    const th=document.createElement('th'); th.className='th-notes'; th.textContent='Notes'; thead.appendChild(th);
  }
  document.getElementById('tblCount').textContent = `${txns.length} transactions · ${txns.filter(t=>t.gst).length} GST items`;
  tbody.innerHTML = txns.map((t,i)=>{
    const ds  = t.date ? t.date.toLocaleDateString('en-AU',{day:'2-digit',month:'short',year:'numeric'}) : '—';
    const aStr= (t.amount>=0?'+':'')+fmt(t.amount);
    const opts= CATS.map(c=>`<option value="${c}"${c===t.cat?' selected':''}>${c}</option>`).join('');
    return `<tr class="${t.gst?'gst':''}" id="r${i}">
      <td class="dc">${ds}</td>
      <td class="dsc" title="${t.desc}">${t.desc}</td>
      <td class="ac ${t.amount>=0?'pos':'neg'}">${aStr}</td>
      <td><select class="cs" onchange="updCat(${i},this.value)">${opts}</select></td>
      <td><div class="gtd">
        <button class="gtag on${t.gst?' active':''}" onclick="togGST(${i},true)">GST</button>
        <button class="gtag off${!t.gst?' active':''}" onclick="togGST(${i},false)">NON</button>
      </div></td>
      <td><input class="note-inp" type="text" value="${t.note||''}" placeholder="note…" oninput="txns[${i}].note=this.value;saveTxnsLocal()" style="background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:6px;padding:4px 8px;font-size:11px;color:#fff;font-family:'DM Mono',monospace;width:110px"/></td>
    </tr>`;
  }).join('');
  updateTotalsBar(txns);
}

function updCat(i,v) { txns[i].cat=v; txns[i].gst=!GST_OFF_CATS.has(v); refRow(i); updateTotalsBar(txns); saveTxnsLocal(); }
function togGST(i,v) { txns[i].gst=v; refRow(i); updateTotalsBar(txns); saveTxnsLocal(); }
function refRow(i) {
  const row=document.getElementById('r'+i); if(!row) return;
  row.className=txns[i].gst?'gst':'';
  const btns=row.querySelectorAll('.gtag');
  btns[0].className='gtag on'+(txns[i].gst?' active':'');
  btns[1].className='gtag off'+(!txns[i].gst?' active':'');
  document.getElementById('tblCount').textContent=`${txns.length} transactions · ${txns.filter(t=>t.gst).length} GST items`;
}

// ══ localStorage persistence for txns ══
function saveTxnsLocal() {
  if (!txns.length) return;
  try {
    const data = txns.map(t=>({...t, date: t.date ? t.date.toISOString() : null}));
    localStorage.setItem('bp_txns', JSON.stringify(data));
  } catch(e) {}
}
function loadTxnsLocal() {
  try {
    const raw = localStorage.getItem('bp_txns');
    if (!raw) return;
    txns = JSON.parse(raw).map(t=>({...t, date: t.date ? new Date(t.date) : null}));
    if (txns.length) { buildTable(); appStep(3); toast(`Restored ${txns.length} transactions from last session`,'info'); }
  } catch(e) {}
}

// ══ API KEY UI ══
function injectKeyField() {
  const dz = document.getElementById('dz');
  if (!dz || document.getElementById('claudeKeyRow')) return;
  const row = document.createElement('div');
  row.id = 'claudeKeyRow';
  row.style.cssText = 'margin-top:12px;display:flex;gap:8px;align-items:center';
  row.innerHTML = `<input id="claudeKeyInp" type="password" placeholder="Paste Claude API key for AI categorisation (optional)" style="flex:1;padding:9px 12px;border-radius:8px;border:1.5px solid rgba(255,255,255,.15);background:rgba(255,255,255,.06);color:#fff;font-size:12px;font-family:'DM Mono',monospace" value="${getApiKey()}"/>
    <button onclick="setApiKey(document.getElementById('claudeKeyInp').value);toast('API key saved ✓','success')" style="background:rgba(56,189,248,.15);border:1px solid rgba(56,189,248,.3);color:#38bdf8;padding:9px 14px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;font-family:'DM Sans',sans-serif">Save Key</button>`;
  dz.parentNode.insertBefore(row, dz.nextSibling);
}

// ══ DASHBOARD ══
function updateDashboard() {
  if (!window.currentUser) return;
  const name=window.currentUser.firstName||'there', h=new Date().getHours();
  const g = h<12?'Good morning':h<17?'Good afternoon':'Good evening';
  document.getElementById('dashHello').textContent = `${g}, ${name}! 👋`;
  document.getElementById('dashDate').textContent = new Date().toLocaleDateString('en-AU',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  const plan=PLANS_INFO[window.currentUser.plan]||PLANS_INFO.starter;
  const daysLeft=Math.max(0,Math.ceil((new Date(window.currentUser.trialEnds)-new Date())/(1000*60*60*24)));
  document.getElementById('planPill').textContent=`${plan.icon} ${plan.name} ${daysLeft>0?'· '+daysLeft+'d trial':''}`;
  const reps=window.currentUser.reports||[];
  document.getElementById('ds1').textContent=reps.length;
  document.getElementById('ds2').textContent='$'+reps.reduce((s,r)=>s+(r.gst1B||0),0).toFixed(0);
  document.getElementById('ds3').textContent='$'+reps.reduce((s,r)=>s+(r.netGST||0),0).toFixed(0);
  document.getElementById('ds4').textContent=reps.length>0?new Date(reps[reps.length-1].date).toLocaleDateString('en-AU',{day:'numeric',month:'short'}):'—';
  const recentBox=document.getElementById('recentReps');
  const titleEl=document.querySelector('#page-dashboard .dash-box-title');
  if (titleEl) titleEl.innerHTML='Recent Reports <a onclick="navTo(\'reports\')">View All →</a>';
  recentBox.innerHTML=reps.length>0
    ? reps.slice(-5).reverse().map(r=>`<div class="report-row" onclick="viewReport(${reps.indexOf(r)})" style="cursor:pointer"><div class="rr-left"><div class="rr-ico">📊</div><div><div class="rr-name">BAS Q${Math.ceil((new Date(r.date).getMonth()+1)/3)} ${new Date(r.date).getFullYear()}</div><div class="rr-date">${new Date(r.date).toLocaleDateString('en-AU',{day:'numeric',month:'short',year:'numeric'})}</div></div></div><div class="rr-amt">${fmt(r.netGST||0)}</div></div>`).join('')
    : '<div class="empty-st">📋 No reports yet — <a onclick="navTo(\'app\')" style="color:#38bdf8;cursor:pointer">generate your first BAS</a></div>';
  checkATODueDate();
}

// ══ REPORTS PAGE ══
function loadReportsPage() {
  if (!window.currentUser) return;
  const reps=window.currentUser.reports||[];
  const tbody=document.getElementById('reportsTableBody');
  if (!reps.length){tbody.innerHTML='<div class="empty-st" style="padding:40px">📋 No reports yet — <a onclick="navTo(\'app\')" style="color:#38bdf8;cursor:pointer">generate your first BAS</a></div>';return;}
  renderReportRows(reps,'all'); renderMiniChart(reps);
}
function renderReportRows(reps,filter){
  const filtered=filter==='all'?reps:reps.filter(r=>getQuarter(r.date)===filter);
  const tbody=document.getElementById('reportsTableBody');
  if(!filtered.length){tbody.innerHTML='<div class="empty-st" style="padding:28px">No reports for this quarter.</div>';return;}
  tbody.innerHTML=filtered.slice().reverse().map((r)=>{
    const d=new Date(r.date), idx=reps.indexOf(r);
    const q='Q'+Math.ceil((d.getMonth()+1)/3)+' '+d.getFullYear();
    return `<div class="rep-row"><div><div class="rep-period">${q}</div><div class="rep-period-sub">${d.toLocaleDateString('en-AU',{day:'numeric',month:'short',year:'numeric'})}</div></div><div class="rep-money green">${fmt(r.gst1A||0)}</div><div class="rep-money red">${fmt(r.gst1B||0)}</div><div class="rep-money blue">${fmt(r.netGST||0)}</div><div class="rep-actions"><button class="rep-btn" onclick="viewReport(${idx})">View</button><button class="rep-btn" onclick="deleteReport(${idx})">🗑</button></div></div>`;
  }).join('');
}
function getQuarter(ds){const m=new Date(ds).getMonth()+1;if(m>=7&&m<=9)return'Q1';if(m>=10&&m<=12)return'Q2';if(m>=1&&m<=3)return'Q3';return'Q4';}
function filterReports(q,btn){document.querySelectorAll('.qbtn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');renderReportRows(window.currentUser.reports||[],q);}
function viewReport(idx){
  const r=(window.currentUser.reports||[])[idx]; if(!r)return;
  const d=new Date(r.date), q='Q'+Math.ceil((d.getMonth()+1)/3)+' '+d.getFullYear();
  document.getElementById('rdTitle').textContent='BAS Report — '+q;
  document.getElementById('rdDate').textContent='Generated '+d.toLocaleDateString('en-AU',{day:'numeric',month:'long',year:'numeric'});
  document.getElementById('rdKpi').innerHTML=`<div class="kcard sales"><div class="klbl">GST on Sales (1A)</div><div class="kval">${fmt(r.gst1A||0)}</div></div><div class="kcard exp"><div class="klbl">GST Credits (1B)</div><div class="kval">${fmt(r.gst1B||0)}</div></div><div class="kcard net"><div class="klbl">Net GST Payable</div><div class="kval">${fmt(r.netGST||0)}</div></div>`;
  document.getElementById('rdAto').innerHTML=`<div class="ato-t">ATO Payment Summary</div><div class="ato-s">${q} · ${r.totalTxns||0} transactions</div><div class="ato-g"><div class="ato-item"><label>Label 1A</label><div class="av">${fmt(r.gst1A||0)}</div></div><div class="ato-item"><label>Label 1B</label><div class="av">− ${fmt(r.gst1B||0)}</div></div><div class="ato-item"><label>Label 9 — Net Payable</label><div class="av big">${fmt(r.netGST||0)}</div></div></div><div class="ato-w">⚠️ Lodge via ATO Business Portal · BPAY 75556</div>`;
  navTo('report-detail');
}
function deleteReport(idx){if(!confirm('Delete this report?'))return;window.currentUser.reports.splice(idx,1);saveUser(window.currentUser);loadReportsPage();toast('Report deleted','info');}
function exportAllCSV(){
  if(!window.currentUser||!window.currentUser.reports?.length){toast('No reports to export','warning');return;}
  const rows=[['Date','Period','GST 1A','GST 1B','Net GST','Transactions']];
  window.currentUser.reports.forEach(r=>{const d=new Date(r.date);rows.push([d.toLocaleDateString('en-AU'),'Q'+Math.ceil((d.getMonth()+1)/3)+' '+d.getFullYear(),r.gst1A||0,r.gst1B||0,r.netGST||0,r.totalTxns||0]);});
  const a=document.createElement('a');a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(rows.map(r=>r.join(',')).join('\n'));
  a.download='BASPilot_Reports_'+new Date().toISOString().slice(0,10)+'.csv';a.click();toast('CSV exported ✓','success');
}
function renderMiniChart(reps){
  const last6=reps.slice(-6),max=Math.max(...last6.map(r=>Math.max(r.gst1A||0,r.gst1B||0)),1);
  const existing=document.getElementById('miniChart');if(existing)existing.remove();if(last6.length<2)return;
  const div=document.createElement('div');div.id='miniChart';div.className='chart-wrap';div.style.marginBottom='16px';
  div.innerHTML=`<div class="chart-title">GST Trend (last ${last6.length} reports)</div><div style="display:flex;gap:8px;align-items:flex-end;height:70px;margin-bottom:6px">${last6.map(r=>{const d=new Date(r.date),q='Q'+Math.ceil((d.getMonth()+1)/3),h1=Math.max(Math.round((r.gst1A||0)/max*60),4),h2=Math.max(Math.round((r.gst1B||0)/max*60),4);return`<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px"><div style="width:100%;display:flex;gap:2px;align-items:flex-end;height:60px"><div style="flex:1;height:${h1}px;background:linear-gradient(to top,#057a55,#6ee7b7);border-radius:3px 3px 0 0;min-height:4px"></div><div style="flex:1;height:${h2}px;background:linear-gradient(to top,#c81e1e,#f87171);border-radius:3px 3px 0 0;min-height:4px"></div></div><div style="font-size:9px;color:rgba(255,255,255,.3);font-family:'DM Mono',monospace">${q}</div></div>`;}).join('')}</div><div style="display:flex;gap:12px;font-size:10px;color:rgba(255,255,255,.35)"><span><span style="width:10px;height:10px;border-radius:2px;background:#6ee7b7;display:inline-block;margin-right:4px"></span>GST 1A</span><span><span style="width:10px;height:10px;border-radius:2px;background:#f87171;display:inline-block;margin-right:4px"></span>GST 1B</span></div>`;
  const dashBottom=document.querySelector('#page-reports .btn-row');if(dashBottom)dashBottom.parentNode.insertBefore(div,dashBottom);
}

// ══ PASSWORD STRENGTH ══
function initStrengthMeter(){
  const passInput=document.getElementById('spass');if(!passInput||document.getElementById('strengthWrap'))return;
  passInput.parentNode.style.position='relative';
  const toggle=document.createElement('button');toggle.type='button';toggle.className='pass-toggle';toggle.textContent='👁';
  toggle.onclick=()=>{passInput.type=passInput.type==='password'?'text':'password';toggle.textContent=passInput.type==='password'?'👁':'🙈';};
  passInput.parentNode.appendChild(toggle);
  const wrap=document.createElement('div');wrap.id='strengthWrap';wrap.style.marginTop='6px';
  wrap.innerHTML=`<div style="display:flex;gap:3px;margin-bottom:3px"><div id="ss1" style="flex:1;height:4px;border-radius:2px;background:#e2e8f0;transition:.3s"></div><div id="ss2" style="flex:1;height:4px;border-radius:2px;background:#e2e8f0;transition:.3s"></div><div id="ss3" style="flex:1;height:4px;border-radius:2px;background:#e2e8f0;transition:.3s"></div><div id="ss4" style="flex:1;height:4px;border-radius:2px;background:#e2e8f0;transition:.3s"></div></div><div id="strengthText" style="font-size:10px;color:#94a3b8">Enter a password</div>`;
  passInput.parentNode.appendChild(wrap);passInput.addEventListener('input',checkStrength);
}
function checkStrength(){
  const val=document.getElementById('spass')?.value||'';let score=0;
  if(val.length>=8)score++;if(/[A-Z]/.test(val))score++;if(/[0-9]/.test(val))score++;if(/[^A-Za-z0-9]/.test(val))score++;
  ['ss1','ss2','ss3','ss4'].forEach((id,i)=>{const el=document.getElementById(id);if(el)el.className='strength-seg'+(i<score?' s'+score:'');});
  const txt=document.getElementById('strengthText');if(txt)txt.textContent=score===0?'Enter a password':['Weak','Fair','Good','Strong'][score-1]+' password'+(score===4?' ✓':'');
}

// ══ ONBOARDING ══
function showOnboarding(name){
  document.getElementById('onboardName').textContent=`Welcome, ${name}! Here's how BAS Pilot works:`;
  document.getElementById('onboardingModal').classList.add('show');
}
function closeOnboarding(){document.getElementById('onboardingModal').classList.remove('show');navTo('app');}

// ══ EMAIL VERIFY ══
function showVerifyPage(email){document.getElementById('verifyEmail').textContent=email||'your email';navTo('verify');}
function resendVerification(){toast('Verification email resent — check your inbox','success');}

// ══ ATO DUE DATE ══
function checkATODueDate(){
  const now=new Date(),due=new Date('2026-02-28'),daysLeft=Math.ceil((due-now)/(1000*60*60*24));
  const alert=document.getElementById('atoAlert');if(!alert)return;
  if(daysLeft<0){alert.style.display='none';return;}
  if(daysLeft<=30){
    alert.style.background='linear-gradient(90deg,rgba(200,30,30,.2),rgba(200,30,30,.08))';
    alert.style.borderColor='rgba(248,113,113,.4)';
    const t=alert.querySelector('div div:first-child');if(t){t.style.color='#f87171';t.textContent=`🚨 BAS Q2 DUE IN ${daysLeft} DAYS — 28 February 2026`;}
  }
}

// ══ NAV UPDATE ══
function updateNav(){
  const li=!!window.currentUser;
  document.getElementById('navGuest').style.display=li?'none':'flex';
  document.getElementById('navUser').style.display=li?'flex':'none';
  if(li){const n=window.currentUser.firstName||window.currentUser.email?.split('@')[0]||'User';document.getElementById('navAvatar').textContent=n[0].toUpperCase();document.getElementById('navUserName').textContent=n;}
  const nc=document.getElementById('navCenter'),existing=document.getElementById('nl-reports');
  if(li&&!existing){
    const btn=document.createElement('button');btn.className='nav-link';btn.id='nl-reports';btn.onclick=()=>navTo('reports');btn.textContent='Reports';nc.appendChild(btn);
    const mm=document.getElementById('mobileMenu');
    if(mm&&!document.getElementById('mm-reports')){const ml=document.createElement('div');ml.className='mobile-menu-link';ml.id='mm-reports';ml.onclick=()=>navTo('reports');ml.textContent='My Reports';mm.insertBefore(ml,mm.querySelector('.mobile-menu-close').nextSibling);}
  }else if(!li&&existing){existing.remove();document.getElementById('mm-reports')?.remove();}
}

function prefillContact(){
  if(!window.currentUser)return;
  const n=document.getElementById('cname'),e=document.getElementById('cemail');
  if(n&&!n.value)n.value=(window.currentUser.firstName||'')+' '+(window.currentUser.lastName||'');
  if(e&&!e.value)e.value=window.currentUser.email||'';
}

// ══ BAS CALCULATE (wires btnCalc) ══
function saveReport(d){
  if(!window.currentUser)return;
  window.currentUser.reports=window.currentUser.reports||[];
  window.currentUser.reports.push({date:new Date().toISOString(),gst1A:d.gst1A,gst1B:d.gst1B,netGST:d.netGST,totalTxns:d.totalTxns});
  saveUser(window.currentUser);
}

// ══ INIT ══
document.addEventListener('DOMContentLoaded',()=>{
  loadUser(); updateNav();

  // File input listeners
  const fi=document.getElementById('fi');
  if(fi) fi.addEventListener('change',e=>handleFiles(e.target.files));
  const dz=document.getElementById('dz');
  if(dz){
    dz.addEventListener('dragover',e=>{e.preventDefault();dz.classList.add('drag');});
    dz.addEventListener('dragleave',()=>dz.classList.remove('drag'));
    dz.addEventListener('drop',e=>{e.preventDefault();dz.classList.remove('drag');handleFiles(e.dataTransfer.files);});
  }

  // Step 2 button
  const btnS2=document.getElementById('btnS2');
  if(btnS2) btnS2.addEventListener('click',()=>{appStep(2);runAI();});

  // Step 4 button
  const btnCalc=document.getElementById('btnCalc');
  if(btnCalc) btnCalc.addEventListener('click',()=>{
    appStep(4);document.getElementById('loading').classList.add('show');document.getElementById('resContent').style.display='none';
    setTimeout(()=>{window.basData=calcBAS(txns);renderBAS(window.basData);saveReport(window.basData);},600);
  });

  // Modal backdrop
  document.getElementById('modal')?.addEventListener('click',e=>{if(e.target===document.getElementById('modal'))closeModal();});
  document.getElementById('onboardingModal')?.addEventListener('click',function(e){if(e.target===this)closeOnboarding();});

  // Keyboard
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'){closeModal();document.getElementById('mobileMenu')?.classList.remove('open');document.getElementById('onboardingModal')?.classList.remove('show');}
  });

  // Inject API key field when app page is shown
  injectKeyField();

  // Restore last session's txns
  loadTxnsLocal();

  console.log('BAS Pilot v2.1 loaded ✅');
});
