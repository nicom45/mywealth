/* MyWealth V4.7 - black/gold theme, reliable Bourso import, zero-account filtering, KPI details */
(() => {
  const GOLD='#d8a657', GOLD2='#f0c77b', GOLD3='#9f7335';
  const style=document.createElement('style');
  style.textContent=`
  :root{--n:#17130d!important;--b:${GOLD}!important;--o:${GOLD2}!important;--bg:#050505!important;--m:#9e9a92!important}
  body{background:#000!important;color:#f5f2eb!important}.app{background:#050505!important}.hero{background:linear-gradient(145deg,#080808,#17130d)!important;border-bottom:1px solid #3a2c19}.card,.sheet,.nav{background:#101010!important;color:#f5f2eb!important;border:1px solid #24211c}.title,.brand{color:#f5f2eb}.tag{color:${GOLD2};background:#d8a65718!important}.primary,.fab{background:${GOLD2}!important;color:#16100a!important}.secondary{background:#211b12!important;color:${GOLD2}!important;border:1px solid #4b3920}.nav .sel{color:${GOLD2}!important}.nav button{color:#8e8a82}.input{background:#0b0b0b!important;color:#f5f2eb!important;border-color:#39342c!important}.row,details{border-color:#26231e!important}.bar{background:#25211b!important}.bar i{background:linear-gradient(90deg,${GOLD3},${GOLD2})!important}.status{background:#1d190f!important;color:${GOLD2}!important}.pct{color:#a79c8a!important}.envelope-metric{background:#101010!important;border:1px solid #2c2923!important;border-radius:14px!important;padding:11px 9px!important}.envelope-metric .lab{color:#9e9a92!important}.balance-positive{color:#43d997!important}.balance-negative{color:#ff6969!important}.balance-neutral{color:#aaa39a!important}
  `;
  document.head.appendChild(style);

  const keyOf=x=>`${x.date}|${norm(x.libelle)}|${num(x.montant).toFixed(2)}`;
  const mapLabel=label=>{const u=norm(label);const r=(db.mapping||[]).find(x=>u.includes(norm(x.keyword)));return r?r.sous:'Non catégorisé'};
  async function importBourso(file){
    if(!file)return;
    if(typeof XLSX==='undefined')throw Error('La bibliothèque Excel ne s’est pas chargée. Ferme et rouvre MyWealth avec une connexion internet.');
    const w=XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:true});
    const a=XLSX.utils.sheet_to_json(w.Sheets[w.SheetNames[0]],{header:1,defval:null,raw:true});
    const clean=x=>norm(x).replace(/[^A-Z0-9]/g,'');
    const hi=a.findIndex(r=>r.some(x=>clean(x).includes('DATEOPERATION')));
    if(hi<0)throw Error('entête Date Opération introuvable');
    const h=a[hi].map(x=>String(x||''));
    const ix=n=>h.findIndex(x=>clean(x)===clean(n));
    const di=ix('Date Opération'),li=ix('Libellé');
    const sol=h.map((x,i)=>clean(x)==='SOLDE'?i:-1).filter(i=>i>=0),ai=sol[0];
    if(di<0||li<0||ai==null)throw Error('colonnes Date, Libellé ou Montant introuvables');
    const rows=a.slice(hi+1).filter(r=>r[di]&&r[li]).map(r=>({date:iso(r[di]),libelle:String(r[li]).trim(),montant:num(r[ai]),sous:mapLabel(r[li]),source:'BoursoBank'}));
    const seen=new Set(db.transactions.map(keyOf));let added=[];
    rows.forEach(x=>{const k=keyOf(x);if(!seen.has(k)){seen.add(k);added.push(x)}});
    db.transactions.push(...added);save();render();
    const mapped=added.filter(x=>x.sous!=='Non catégorisé').length;
    alert(`${added.length} nouvelles opérations BoursoBank ajoutées, dont ${mapped} catégorisées automatiquement.`);
  }

  // Replace duplicate/ambiguous inputs with one reliable input owned by this enhancement.
  document.querySelectorAll('input[id="bourso"],input[id^="bourso-duplicate"]').forEach(x=>x.remove());
  const input=document.createElement('input');input.type='file';input.accept='.xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,*/*';input.hidden=true;input.id='bourso-v47';document.body.appendChild(input);
  input.addEventListener('change',async e=>{try{await importBourso(e.target.files[0])}catch(err){alert('Import BoursoBank impossible : '+err.message)}finally{e.target.value=''}});
  document.querySelectorAll('button').forEach(button=>{if(button.textContent.includes('Importer BoursoBank'))button.onclick=()=>{const m=document.getElementById('addModal');if(m)m.style.display='none';input.click();}});

  // Budget balance if not already present.
  const spendCard=document.getElementById('spend')?.closest('.card'),grid=spendCard?.parentElement;
  if(grid&&!document.getElementById('balance')){grid.style.gridTemplateColumns='repeat(3,1fr)';const c=document.createElement('div');c.className='card';c.innerHTML='<div class="lab">Équilibre</div><div class="val balance-neutral" id="balance">—</div>';grid.appendChild(c)}
  const rb=window.renderBudget;window.renderBudget=function(){rb?.apply(this,arguments);const tx=typeof txPeriod==='function'?txPeriod():[];let r=0,d=0;tx.forEach(x=>{const z=db.categories.find(y=>y.sous===x.sous)||{};if(z.rev)r+=num(x.montant);if(z.dep)d+=Math.abs(num(x.montant))});const v=r-d,e=document.getElementById('balance');if(e){e.textContent=euro(v);e.className='val '+(v>0?'balance-positive':v<0?'balance-negative':'balance-neutral')}};

  // Hide zero-value accounts and enrich investment envelopes.
  const ri=window.renderInvest;window.renderInvest=function(){ri?.apply(this,arguments);const holder=document.getElementById('iAccounts');if(!holder)return;const vals=Object.values(latest()).filter(x=>invNames.includes(x.compte)&&Math.abs(num(x.solde))>0.005);holder.innerHTML=vals.map(x=>{const cap=(db.investments||[]).filter(f=>f.compte===x.compte&&(!x.date||f.date<=x.date)).reduce((s,f)=>s+num(f.montant),0),g=num(x.solde)-cap,p=cap?g/cap*100:0,cl=g>0?'balance-positive':g<0?'balance-negative':'balance-neutral';return `<div class="row"><div class="grow"><div class="name">${x.compte}</div><div class="envelope-metrics"><div class="envelope-metric"><span class="lab">Investi</span><b>${euro(cap)}</b></div><div class="envelope-metric"><span class="lab">Gain</span><b class="${cl}">${euro(g)}</b></div><div class="envelope-metric"><span class="lab">Perf.</span><b class="${cl}">${p.toFixed(1)} %</b></div></div></div><div class="amt">${euro(x.solde)}</div></div>`}).join('')||'<div class="empty">Aucune donnée</div>'};
  const baseRender=window.render;window.render=function(){baseRender?.apply(this,arguments);const holder=document.getElementById('accounts');if(holder){const vals=Object.values(latest()).filter(x=>Math.abs(num(x.solde))>0.005);holder.innerHTML=vals.map(x=>`<div class="row"><div class="grow">${x.compte}<div class="sub">${x.date}</div></div><div class="amt">${euro(x.solde)}</div></div>`).join('')||'<div class="empty">Aucun compte valorisé</div>'}window.renderBudget?.();window.renderInvest?.()};
  window.render();
})();
