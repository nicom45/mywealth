/* MyWealth V4.5 - safe historical merge. Load after the main application script. */
(() => {
  const keyOf = x => `${x.date}|${norm(x.libelle)}|${num(x.montant).toFixed(2)}`;
  const mergeBy = (current, incoming, keyFn) => {
    const out = [...current];
    const pos = new Map(out.map((x, i) => [keyFn(x), i]));
    incoming.forEach(x => {
      const k = keyFn(x);
      if (pos.has(k)) {
        // Preserve user-entered/local values when present; fill only missing fields.
        const old = out[pos.get(k)];
        out[pos.get(k)] = {
          ...x,
          ...old,
          sous: old.sous && old.sous !== 'Non catégorisé' ? old.sous : x.sous
        };
      } else {
        pos.set(k, out.length);
        out.push(x);
      }
    });
    return out;
  };

  const fileInput = document.getElementById('legacy');
  if (!fileInput) return;

  fileInput.onchange = async e => {
    try {
      const file = e.target.files[0];
      if (!file) return;
      const w = await readX(file);

      const a = XLSX.utils.sheet_to_json(w.Sheets['F_Transactions'], {header:1, defval:null});
      const h = a.findIndex(r => r.includes('Date'));
      const historical = a.slice(h + 1).filter(r => r[0]).map(r => ({
        date: iso(r[0]),
        libelle: r[1] || '',
        sous: r[6] || r[5] || 'Non catégorisé',
        montant: num(r[7]),
        source: 'Historique Excel'
      }));

      const c = XLSX.utils.sheet_to_json(w.Sheets['D_Catégories'], {header:1, defval:null});
      const ch = c.findIndex(r => r.includes('Nature flux'));
      const categories = c.slice(ch + 1).filter(r => r[2]).map(r => ({
        nature: r[0], categorie: r[1], sous: r[2], bucket: r[3],
        rev: num(r[5]), dep: num(r[7]), inv: num(r[8])
      }));

      const ma = XLSX.utils.sheet_to_json(w.Sheets['T_Mapping'], {header:1, defval:null});
      const mh = ma.findIndex(r => r.includes('Mot clé'));
      const mapping = ma.slice(mh + 1).filter(r => r[0] && r[1]).map(r => ({
        keyword: String(r[0]).trim(), sous: String(r[1]).trim()
      }));

      const before = db.transactions.length;
      db.transactions = mergeBy(db.transactions, historical, keyOf);
      // Local categories/rules win over Excel if the same key already exists.
      db.categories = mergeBy(db.categories, categories, x => norm(x.sous));
      db.mapping = mergeBy(db.mapping, mapping, x => norm(x.keyword));
      save();
      render();

      const added = db.transactions.length - before;
      alert(`${added} transaction(s) historique(s) ajoutée(s). Les opérations BoursoBank et les catégorisations locales ont été conservées.`);
    } catch (x) {
      alert('Fusion historique impossible : ' + x.message);
    } finally {
      e.target.value = '';
    }
  };
})();
