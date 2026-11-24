/* MyWealth V4.6 enhancements: Bourso import routing, dark theme, budget balance, envelope performance. */
(() => {
  const style = document.createElement('style');
  style.textContent = `
    .balance-positive{color:#39d98a!important}.balance-negative{color:#ff6b6b!important}.balance-neutral{color:var(--m)!important}
    .envelope-metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-top:8px}
    .envelope-metric{background:rgba(127,140,150,.09);padding:8px;border-radius:10px}
    .envelope-metric .lab{font-size:10px}.envelope-metric b{font-size:12px;display:block;margin-top:3px}
    @media (prefers-color-scheme: dark){
      :root{--bg:#0b1118;--m:#94a3b2;--n:#071f36;--b:#25a8f0;--g:#39d98a;--o:#ffa45b}
      body{background:#05090e;color:#eef6fc}.app{background:var(--bg)}.card,.sheet,.nav{background:#121c26;color:#eef6fc}
      .row,details{border-color:#24313d}.input{background:#0d1620;color:#eef6fc;border-color:#334250}
      .secondary{background:#17344a;color:#89d4ff}.status{background:#103326;color:#7fe2b9}.bar{background:#26333e}
      .modal{background:#000c}.hero{background:linear-gradient(145deg,#061c30,#073d5a)}
    }`;
  document.head.appendChild(style);

  // Use one canonical file input for every BoursoBank button. Duplicate IDs in the page previously broke one entry point.
  const boursoInputs = [...document.querySelectorAll('input[id="bourso"]')];
  const canonicalBourso = boursoInputs[0];
  boursoInputs.slice(1).forEach((input, i) => { input.id = `bourso-duplicate-${i+1}`; input.remove(); });
  [...document.querySelectorAll('button')].filter(b => b.textContent.includes('Importer BoursoBank')).forEach(button => {
    button.onclick = () => {
      const addModal = document.getElementById('addModal');
      if(addModal) addModal.style.display='none';
      canonicalBourso?.click();
    };
  });

  // Add a third Budget KPI without changing the existing surrounding layout.
  const spendCard = document.getElementById('spend')?.closest('.card');
  const budgetGrid = spendCard?.parentElement;
  if (budgetGrid && !document.getElementById('balance')) {
    budgetGrid.style.gridTemplateColumns='repeat(3,1fr)';
    const card=document.createElement('div'); card.className='card';
    card.innerHTML='<div class="lab">Équilibre</div><div class="val balance-neutral" id="balance">—</div>';
    budgetGrid.appendChild(card);
  }

  const baseRenderBudget = window.renderBudget;
  window.renderBudget = function(){
    baseRenderBudget?.apply(this, arguments);
    const tx = typeof txPeriod==='function' ? txPeriod() : [];
    let revenues=0, expenses=0;
    tx.forEach(x=>{const z=db.categories.find(y=>y.sous===x.sous)||{};if(z.rev)revenues+=num(x.montant);if(z.dep)expenses+=Math.abs(num(x.montant));});
    const value=revenues-expenses, el=document.getElementById('balance');
    if(el){el.textContent=euro(value);el.className='val '+(value>0?'balance-positive':value<0?'balance-negative':'balance-neutral');}
  };

  const baseRenderInvest = window.renderInvest;
  window.renderInvest = function(){
    baseRenderInvest?.apply(this, arguments);
    const holder=document.getElementById('iAccounts'); if(!holder)return;
    const vals=Object.values(latest()).filter(x=>invNames.includes(x.compte));
    holder.innerHTML = vals.map(x=>{
      const invested=(db.investments||[]).filter(f=>f.compte===x.compte && (!x.date||f.date<=x.date)).reduce((s,f)=>s+num(f.montant),0);
      const gain=num(x.solde)-invested, perf=invested?gain/invested*100:0;
      const cls=gain>0?'balance-positive':gain<0?'balance-negative':'balance-neutral';
      return `<div class="row"><div class="grow"><div class="name">${x.compte}</div><div class="envelope-metrics"><div class="envelope-metric"><span class="lab">Investi</span><b>${euro(invested)}</b></div><div class="envelope-metric"><span class="lab">Gain</span><b class="${cls}">${euro(gain)}</b></div><div class="envelope-metric"><span class="lab">Perf.</span><b class="${cls}">${perf.toFixed(1)} %</b></div></div></div><div class="amt">${euro(x.solde)}</div></div>`;
    }).join('') || '<div class="empty">Aucune donnée</div>';
  };

  // Re-render once after wrappers are installed.
  window.renderBudget?.(); window.renderInvest?.();
})();
