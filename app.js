function FinanceAssistantApp() {
  const STORAGE_KEY = "finance_state_v1";
  const SNAPSHOT_KEY = "finance_snapshots_v1";

  const initialState = {
    ahorro: 3092.97,
    personales: 873.12,
    inversion: 948.19,
    autoSplit: true,
    history: []
  };

  const [state, setState] = React.useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : initialState;
    } catch (e) {
      console.error("Error reading storage", e);
      return initialState;
    }
  });

  const [amount, setAmount] = React.useState("");
  const [type, setType] = React.useState("ingreso");
  const [target, setTarget] = React.useState("auto");
  const [snapshots, setSnapshots] = React.useState(() => {
    try {
      const raw = localStorage.getItem(SNAPSHOT_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  });

  // persist on any state change
  React.useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error("Error saving state", e);
    }
  }, [state]);

  // persist snapshots
  React.useEffect(() => {
    try {
      localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshots));
    } catch (e) {
      console.error("Error saving snapshots", e);
    }
  }, [snapshots]);

  function format(n) {
    return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function addMovement() {
    const raw = parseFloat(String(amount).replace(/[^0-9.-]+/g, ""));
    if (!isFinite(raw) || raw === 0) return;

    const value = Math.round(raw * 100) / 100;
    const entry = { date: new Date().toISOString(), type, value, target };

    setState(prev => {
      let ahorro = prev.ahorro;
      let personales = prev.personales;
      let inversion = prev.inversion;

      if (type === "ingreso") {
        if (prev.autoSplit && target === "auto") {
          const a = Math.round(value * 0.10 * 100) / 100;
          const p = Math.round(value * 0.25 * 100) / 100;
          const i = Math.round(value * 0.65 * 100) / 100;
          ahorro += a;
          personales += p;
          inversion += i;
        } else {
          if (target === "ahorro") ahorro += value;
          else if (target === "personales") personales += value;
          else if (target === "inversion") inversion += value;
          else {
            const a = Math.round(value * 0.10 * 100) / 100;
            const p = Math.round(value * 0.25 * 100) / 100;
            const i = Math.round(value * 0.65 * 100) / 100;
            ahorro += a;
            personales += p;
            inversion += i;
          }
        }
      } else {
        if (target === "ahorro") ahorro -= value;
        else if (target === "personales") personales -= value;
        else if (target === "inversion") inversion -= value;
        else personales -= value;
      }

      const newHistory = [{ ...entry, balances: { ahorro, personales, inversion } }, ...prev.history].slice(0, 200);
      return { ...prev, ahorro, personales, inversion, history: newHistory };
    });

    setAmount("");
  }

  function saveSnapshot() {
    const name = prompt("Nombre para la captura (por ejemplo: 'Corte Sep 2025'):");
    if (!name) return;
    const snap = { name, date: new Date().toISOString(), state };
    setSnapshots(prev => [snap, ...prev].slice(0, 50));
    alert("Captura guardada");
  }

  function importSnapshot(index) {
    const snap = snapshots[index];
    if (!snap) return;
    if (!confirm(`Importar captura '${snap.name}' guardada el ${new Date(snap.date).toLocaleString()}? Esto reemplazará los saldos actuales.`)) return;
    setState(snap.state);
    alert("Captura importada");
  }

  function exportCurrent() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `finance_state_${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importFile(file) {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const parsed = JSON.parse(e.target.result);
        if (parsed && typeof parsed === "object") {
          if (confirm("Reemplazar los saldos actuales con los datos importados?")) setState(parsed);
        } else alert("Archivo inválido");
      } catch (err) {
        alert("Error leyendo archivo: " + err.message);
      }
    };
    reader.readAsText(file);
  }

  const total = Math.round((state.ahorro + state.personales + state.inversion) * 100) / 100;

  return (
    <div className="min-h-screen bg-gray-50 p-4 max-w-lg mx-auto">
      <header className="mb-4">
        <h1 className="text-2xl font-bold">Control Financiero (móvil)</h1>
        <p className="text-sm text-gray-600">Guarda en este sitio — los cambios permanecen aunque cierres el navegador.</p>
      </header>

      <section className="grid grid-cols-1 gap-3 mb-4">
        <div className="bg-white p-4 rounded-xl shadow-sm">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-xs text-gray-500">Ahorro / Emergencias</div>
              <div className="text-lg font-semibold">${format(state.ahorro)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Personales</div>
              <div className="text-lg font-semibold">${format(state.personales)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Inversión</div>
              <div className="text-lg font-semibold">${format(state.inversion)}</div>
            </div>
          </div>
          <div className="mt-3 text-sm text-gray-700">Total: <span className="font-medium">${format(total)}</span></div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm">
          <label className="block text-xs text-gray-600 mb-1">Cantidad</label>
          <input
            inputMode="decimal"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full rounded-md border p-2 mb-2"
          />

          <div className="flex gap-2 mb-2">
            <select value={type} onChange={e => setType(e.target.value)} className="flex-1 p-2 rounded-md border">
              <option value="ingreso">Ingreso</option>
              <option value="gasto">Gasto</option>
            </select>

            <select value={target} onChange={e => setTarget(e.target.value)} className="flex-1 p-2 rounded-md border">
              <option value="auto">Auto (10/25/65) — para ingresos</option>
              <option value="ahorro">Ahorro/Emergencias</option>
              <option value="personales">Gastos Personales</option>
              <option value="inversion">Inversión/Negocio</option>
            </select>
          </div>

          <div className="flex gap-2">
            <button onClick={addMovement} className="flex-1 py-2 rounded-md bg-blue-600 text-white font-medium">Registrar</button>
            <button
              onClick={() => setState(initialState)}
              className="py-2 px-3 rounded-md border text-sm"
              title="Restablecer a valores iniciales (temporal)">
              Reset
            </button>
          </div>

          <div className="mt-3 text-xs text-gray-600">
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                checked={state.autoSplit}
                onChange={e => setState(s => ({ ...s, autoSplit: e.target.checked }))}
                className="mr-2"
              /> 
              Aplicar reparto automático a futuros ingresos (10/25/65)
            </label>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm">
          <div className="flex gap-2 mb-2">
            <button onClick={saveSnapshot} className="flex-1 py-2 rounded-md bg-green-600 text-white font-medium">Guardar valores</button>
            <div className="relative">
              <button onClick={() => {
                const list = snapshots.map((s, i) => `${i+1}. ${s.name} — ${new Date(s.date).toLocaleString()}`).join('\n') || 'No hay capturas guardadas';
                const choice = prompt(`Capturas guardadas:\n${list}\n\nIngresa el número de la captura para importar:`);
                const idx = parseInt(choice) - 1;
                if (!isNaN(idx) && idx >= 0 && idx < snapshots.length) importSnapshot(idx);
              }} className="py-2 px-3 rounded-md border">Importar valores</button>
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={exportCurrent} className="flex-1 py-2 rounded-md bg-indigo-600 text-white">Exportar JSON</button>
            <label className="flex-1 py-2 text-center rounded-md border cursor-pointer">
              Importar archivo
              <input type="file" accept="application/json" onChange={e => e.target.files && importFile(e.target.files[0])} className="hidden" />
            </label>
          </div>

          <div className="mt-3 text-xs text-gray-600">Auto-guardado: <span className="font-medium">Activado</span></div>
        </div>

        <div className="bg-white p-3 rounded-xl shadow-sm">
          <h3 className="text-sm font-semibold mb-2">Historial (últimos movimientos)</h3>
          <div className="space-y-2 max-h-48 overflow-auto">
            {state.history.length === 0 && <div className="text-xs text-gray-500">No hay movimientos</div>}
            {state.history.map((h, idx) => (
              <div key={idx} className="text-xs border p-2 rounded">
                <div className="font-medium">{h.type === 'ingreso' ? 'Ingreso' : 'Gasto'} — {h.value}</div>
                <div className="text-gray-600">{new Date(h.date).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>

      </section>

      <footer className="text-center text-xs text-gray-500 mt-4">Hecho para uso móvil. Los datos se almacenan en el navegador (localStorage). Usa Exportar/Importar JSON para respaldos.</footer>
    </div>
  );
}
