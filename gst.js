// ── BAS Pilot · gst.js ──
// GST calculation engine (G1, 1A, 1B, Net GST)

const fmt = n => new Intl.NumberFormat('en-AU',{style:'currency',currency:'AUD',minimumFractionDigits:2}).format(n);

function calcBAS(txns) {
  const gstTxns  = txns.filter(t => t.gst);
  const salesTxns = gstTxns.filter(t => /^sales$/i.test(t.cat) && t.amount > 0);
  const expTxns   = gstTxns.filter(t => t.amount < 0);

  // G1 — Total sales (incl GST). Use Sales-tagged if available, else all positive GST txns
  const salesIncl = salesTxns.length > 0
    ? salesTxns.reduce((s,t) => s + t.amount, 0)
    : gstTxns.filter(t => t.amount > 0).reduce((s,t) => s + t.amount, 0);

  // G10 — Total expenses (incl GST)
  const expIncl = Math.abs(expTxns.reduce((s,t) => s + t.amount, 0));

  // 1A, 1B = 1/11 of respective totals
  const gst1A   = Math.round(salesIncl / 11 * 100) / 100;
  const gst1B   = Math.round(expIncl   / 11 * 100) / 100;
  const netGST  = Math.round((gst1A - gst1B) * 100) / 100;

  // Monthly breakdown
  const monthMap = {};
  gstTxns.forEach(t => {
    if (!t.date) return;
    const k = t.date.toLocaleString('en-AU',{month:'long',year:'numeric'});
    if (!monthMap[k]) monthMap[k] = {sales:0, exp:0, ts:t.date.getTime()};
    if (t.amount > 0) monthMap[k].sales += t.amount;
    else monthMap[k].exp += Math.abs(t.amount);
  });
  const months = {};
  Object.entries(monthMap).sort((a,b)=>a[1].ts-b[1].ts).forEach(([k,v])=>months[k]=v);

  // Category totals (expenses only)
  const cats = {};
  expTxns.forEach(t => {
    const c = t.cat || 'Other';
    if (!cats[c]) cats[c] = {count:0, total:0};
    cats[c].count++;
    cats[c].total += Math.abs(t.amount);
  });

  return {
    salesIncl, expIncl,
    gst1A, gst1B, netGST,
    salesExcl: salesIncl - gst1A,
    expExcl:   expIncl   - gst1B,
    months, cats,
    transactions: txns,
    totalTxns: txns.length,
    gstCount: gstTxns.length
  };
}

// Live totals bar shown in Step 3
function updateTotalsBar(txns) {
  const gstTxns = txns.filter(t => t.gst);
  const sales = gstTxns.filter(t => t.amount > 0).reduce((s,t) => s + t.amount, 0);
  const exp   = Math.abs(gstTxns.filter(t => t.amount < 0).reduce((s,t) => s + t.amount, 0));
  const g1a = sales / 11, g1b = exp / 11, net = g1a - g1b;

  let bar = document.getElementById('liveBar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'liveBar';
    bar.style.cssText = 'background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);border-radius:10px;padding:12px 16px;margin-bottom:10px;display:flex;gap:20px;flex-wrap:wrap;font-family:"DM Mono",monospace;font-size:12px';
    const tblWrap = document.querySelector('#ap3 .tbl-wrap');
    if (tblWrap) tblWrap.parentNode.insertBefore(bar, tblWrap);
  }
  bar.innerHTML = `
    <span style="color:#6ee7b7">GST 1A: <strong>${fmt(g1a)}</strong></span>
    <span style="color:#f87171">GST 1B: <strong>${fmt(g1b)}</strong></span>
    <span style="color:#38bdf8">Net GST: <strong>${fmt(net)}</strong></span>
    <span style="color:rgba(255,255,255,.4)">${gstTxns.length} GST txns</span>`;
}

function renderBAS(d) {
  document.getElementById('loading').classList.remove('show');
  document.getElementById('resContent').style.display = 'block';

  document.getElementById('kpiCards').innerHTML = `
    <div class="kcard sales"><div class="klbl">GST on Sales (1A)</div><div class="kval">${fmt(d.gst1A)}</div><div class="ksub">Sales incl. GST: ${fmt(d.salesIncl)}</div></div>
    <div class="kcard exp"><div class="klbl">GST Credits (1B)</div><div class="kval">${fmt(d.gst1B)}</div><div class="ksub">Expenses incl. GST: ${fmt(d.expIncl)}</div></div>
    <div class="kcard net"><div class="klbl">Net GST Payable (Label 9)</div><div class="kval">${fmt(d.netGST)}</div><div class="ksub">${d.gstCount} GST of ${d.totalTxns} transactions</div></div>`;

  document.getElementById('atoBox').innerHTML = `
    <div class="ato-t">ATO Payment Summary</div><div class="ato-s">Business Activity Statement · GST Quarterly</div>
    <div class="ato-g">
      <div class="ato-item"><label>Label 1A — GST on Sales</label><div class="av">${fmt(d.gst1A)}</div></div>
      <div class="ato-item"><label>Label 1B — GST Credits</label><div class="av">− ${fmt(d.gst1B)}</div></div>
      <div class="ato-item"><label>Label 9 — Net GST Payable</label><div class="av big">${fmt(d.netGST)}</div></div>
    </div>
    <div class="ato-w">⚠️ Lodge via ATO Business Portal · BPAY 75556 · Keep receipts 5 years</div>`;

  document.getElementById('mgrid').innerHTML = Object.entries(d.months).map(([mn,md]) => {
    const n = Math.round((md.sales/11 - md.exp/11)*100)/100;
    return `<div class="mcard">
      <div class="mname">${mn}</div>
      <div class="mr"><span class="ml_">Sales (incl)</span><span class="mv g">${fmt(md.sales)}</span></div>
      <div class="mr"><span class="ml_">GST 1A</span><span class="mv g">${fmt(+(md.sales/11).toFixed(2))}</span></div>
      <div class="mdiv"></div>
      <div class="mr"><span class="ml_">Expenses</span><span class="mv r">${fmt(md.exp)}</span></div>
      <div class="mr"><span class="ml_">GST 1B</span><span class="mv r">${fmt(+(md.exp/11).toFixed(2))}</span></div>
      <div class="mdiv"></div>
      <div class="mr"><span class="ml_">Net GST</span><span class="mv o">${fmt(n)}</span></div>
    </div>`;
  }).join('') || '<div style="color:#94a3b8;font-size:12px;grid-column:1/-1">No date data found.</div>';

  document.getElementById('catBody').innerHTML = Object.entries(d.cats)
    .sort((a,b) => b[1].total - a[1].total)
    .map(([cat,cd]) => {
      const gst = +(cd.total/11).toFixed(2);
      return `<tr style="border-bottom:1px solid #f1f5f9">
        <td style="padding:7px 11px;font-weight:600;font-size:12px">${cat}</td>
        <td style="padding:7px 11px;color:#94a3b8;font-size:12px;text-align:center">${cd.count}</td>
        <td style="padding:7px 11px;font-family:'DM Mono',monospace;font-size:11px">${fmt(cd.total)}</td>
        <td style="padding:7px 11px;font-family:'DM Mono',monospace;font-size:11px;color:#c81e1e;font-weight:600">${fmt(gst)}</td>
        <td style="padding:7px 11px;font-family:'DM Mono',monospace;font-size:11px">${fmt(cd.total-gst)}</td>
      </tr>`;
    }).join('');

  const hasPro = window.currentUser && ['pro','accountant'].includes(window.currentUser.plan);
  document.getElementById('pwOverlay').style.display = hasPro ? 'none' : 'flex';
  const dl = document.getElementById('btnDL');
  dl.textContent = hasPro ? '⬇ Download BAS Excel' : '🔒 Download BAS Excel (Upgrade)';
  dl.onclick = hasPro ? downloadBAS : openModal;
  toast('BAS report generated ✓','success');
}

function downloadBAS() {
  if (!window.basData) return;
  const d = window.basData, wb = XLSX.utils.book_new();
  const sum = [
    ['BAS PILOT — BUSINESS ACTIVITY STATEMENT','','',''],
    ['Generated: '+new Date().toLocaleDateString('en-AU'),'','',''],
    ['','','',''],
    ['FIELD','INCL. GST ($)','GST AMOUNT ($)','EXCL. GST ($)'],
    ['G1 — Total Sales',+d.salesIncl.toFixed(2),+d.gst1A.toFixed(2),+d.salesExcl.toFixed(2)],
    ['G10 — Total Expenses',+d.expIncl.toFixed(2),+d.gst1B.toFixed(2),+d.expExcl.toFixed(2)],
    ['','','',''],
    ['LABEL 1A','',+d.gst1A.toFixed(2),''],
    ['LABEL 1B','',+d.gst1B.toFixed(2),''],
    ['LABEL 9 — NET GST PAYABLE','',+d.netGST.toFixed(2),''],
    ['','','',''],
    ['ATO Business Portal | BPAY 75556','','','']
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(sum);
  ws1['!cols'] = [{wch:36},{wch:16},{wch:16},{wch:16}];
  XLSX.utils.book_append_sheet(wb, ws1, 'BAS Summary');

  const mR = [['Month','Sales','GST 1A','Expenses','GST 1B','Net GST']];
  Object.entries(d.months).forEach(([m,md]) =>
    mR.push([m,+md.sales.toFixed(2),+(md.sales/11).toFixed(2),+md.exp.toFixed(2),+(md.exp/11).toFixed(2),+((md.sales/11-md.exp/11)).toFixed(2)]));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(mR), 'Monthly');

  const cR = [['Category','Txns','Total (incl GST)','GST Credit','Net Amount']];
  Object.entries(d.cats).sort((a,b)=>b[1].total-a[1].total).forEach(([cat,cd]) => {
    const g = +(cd.total/11).toFixed(2);
    cR.push([cat, cd.count, +cd.total.toFixed(2), g, +(cd.total-g).toFixed(2)]);
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(cR), 'Categories');

  const tR = [['Date','Description','Amount','Category','GST?','GST Component','Notes']];
  d.transactions.forEach(t => tR.push([
    t.date ? t.date.toLocaleDateString('en-AU') : '',
    t.desc, +t.amount.toFixed(2), t.cat,
    t.gst ? 'GST' : 'NON GST',
    t.gst ? +(Math.abs(t.amount)/11).toFixed(2) : '',
    t.note || ''
  ]));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(tR), 'Transactions');

  XLSX.writeFile(wb, 'BASPilot_BAS_'+new Date().toISOString().slice(0,10)+'.xlsx');
  toast('BAS Excel downloaded ✓','success');
}
