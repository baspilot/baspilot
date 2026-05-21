// ── BAS Pilot · ai.js ──
// Claude API categorisation + regex fallback

const CATS = ['Sales','Fuel','Advertising','Software','Office Supplies','Transfer','Personal','GST Free','Other'];
const GST_OFF_CATS = new Set(['Transfer','Personal','GST Free']);

const CAT_RULES = [
  {rx:/tax.?office|ato|bpay.{0,20}75556/i,       cat:'GST Free',        gst:false},
  {rx:/^transfer|bpay(?!.*75556)/i,               cat:'Transfer',        gst:false},
  {rx:/salary|payroll|wages/i,                    cat:'GST Free',        gst:false},
  {rx:/personal|family|gift|donation/i,           cat:'Personal',        gst:false},
  {rx:/paypal|stripe|square|shopify|direct.?credit|invoice|sales?|revenue/i, cat:'Sales', gst:true},
  {rx:/ampol|bp |shell|7.?eleven|fuel|petrol|coles.?express|liberty/i, cat:'Fuel', gst:true},
  {rx:/facebook|google.ads|meta.?ads|linkedin|instagram|tiktok|advertising|marketing/i, cat:'Advertising', gst:true},
  {rx:/microsoft|adobe|xero|myob|quickbooks|slack|zoom|dropbox|aws|google.play|apple\.com\/bill|hosting|subscription/i, cat:'Software', gst:true},
  {rx:/officeworks|harvey.?norman|jb.?hi.?fi|bunnings|big.?w|kmart|target/i, cat:'Office Supplies', gst:true},
];

function aiCat(d, a) {
  for (const r of CAT_RULES) if (r.rx.test(d)) return {cat:r.cat, gst:r.gst};
  return {cat: a > 0 ? 'Sales' : 'Other', gst: true};
}

// ── API key storage ──
let _claudeKey = '';
function getApiKey() {
  if (!_claudeKey) _claudeKey = localStorage.getItem('bm_claude_key') || '';
  return _claudeKey;
}
function setApiKey(k) {
  _claudeKey = k.trim();
  localStorage.setItem('bm_claude_key', _claudeKey);
}

// ── Batch Claude API call — one request per upload ──
async function claudeCategorise(transactions) {
  const key = getApiKey();
  if (!key) return null;

  // Chunk into 80-txn batches to stay within token limits
  const BATCH = 80;
  const allResults = [];
  for (let start = 0; start < transactions.length; start += BATCH) {
    const chunk = transactions.slice(start, start + BATCH);
    const lines = chunk.map((t, j) =>
      `${start+j}|${t.desc.slice(0,55)}|${t.amount>=0?'+':''}${t.amount.toFixed(2)}`
    ).join('\n');

    const prompt = `Australian business bank transactions. Categories: Sales,Fuel,Advertising,Software,Office Supplies,Transfer,Personal,GST Free,Other. GST=false for: Transfer,Personal,GST Free.
Reply JSON array only: [{"i":0,"cat":"Sales","gst":true},...]
${lines}`;

    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1024,
          messages: [{role:'user', content:prompt}]
        })
      });
      if (!r.ok) continue;
      const data = await r.json();
      const txt = data.content?.[0]?.text || '';
      const match = txt.match(/\[[\s\S]*?\]/);
      if (match) allResults.push(...JSON.parse(match[0]));
    } catch(e) { console.warn('Claude batch error', e); }
  }
  return allResults.length ? allResults : null;
}
