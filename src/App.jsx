import { useState, useEffect, useRef, useCallback } from "react";

// ─── SUPABASE ─────────────────────────────────────────────────────────────────
const SUPABASE_URL = "https://wvufpjitmrceivllcrqw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind2dWZwaml0bXJjZWl2bGxjcnF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MzgwMjcsImV4cCI6MjA4ODUxNDAyN30.S0jRWYOB7LnUp12vWdCVA-WCKv8xjTW0KdEwVczqzFk";

const authHeaders = (token) => ({
  "Content-Type": "application/json",
  "apikey": SUPABASE_ANON_KEY,
  "Authorization": `Bearer ${token || SUPABASE_ANON_KEY}`,
});

async function sbGet(table, token, filters = [], select = "*", order = null, limit = null) {
  let url = `${SUPABASE_URL}/rest/v1/${table}?select=${select}`;
  filters.forEach(f => { url += `&${f}`; });
  if (order) url += `&order=${order}`;
  if (limit) url += `&limit=${limit}`;
  const r = await fetch(url, { headers: { ...authHeaders(token), Accept: "application/json" } });
  const data = await r.json();
  return Array.isArray(data) ? data : [];
}

async function sbInsert(table, token, body) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST", headers: { ...authHeaders(token), Prefer: "return=representation" },
    body: JSON.stringify(body),
  });
  const data = await r.json();
  return Array.isArray(data) ? data[0] : data;
}

async function sbUpdate(table, token, filter, body) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}`, {
    method: "PATCH", headers: { ...authHeaders(token), Prefer: "return=representation" },
    body: JSON.stringify(body),
  });
  return r.ok;
}

async function sbDelete(table, token, filter) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}`, {
    method: "DELETE", headers: authHeaders(token),
  });
  return r.ok;
}

const authApi = {
  async signUp(email, password) {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: "POST", headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
      body: JSON.stringify({ email, password }),
    });
    return r.json();
  },
  async signIn(email, password) {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST", headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
      body: JSON.stringify({ email, password }),
    });
    return r.json();
  },
};

// ─── THEME ────────────────────────────────────────────────────────────────────
const T = {
  bg: "#0c110e", card: "#131a14", card2: "#192118", card3: "#1f2a1e",
  border: "#263322", borderLight: "#2f3f2c",
  accent: "#a8d5a2", accent2: "#d4c87a", accent3: "#7ab8d4",
  text: "#edf2eb", textMuted: "#7a8f78", textFaint: "#4a5f48",
  done: "#6aab88", danger: "#d47a7a", warning: "#d4a84a",
  font: "'Urbanist', sans-serif",
  grad: "linear-gradient(180deg, #0f170f 0%, #0c110e 100%)",
};

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: "frutas", label: "Frutas y Verduras", emoji: "🥦", pasillo: 1 },
  { id: "lacteos", label: "Lácteos", emoji: "🥛", pasillo: 2 },
  { id: "carnes", label: "Carnes", emoji: "🥩", pasillo: 3 },
  { id: "panaderia", label: "Panadería", emoji: "🧁", pasillo: 4 },
  { id: "abarrotes", label: "Abarrotes", emoji: "🥫", pasillo: 5 },
  { id: "congelados", label: "Congelados", emoji: "🧊", pasillo: 6 },
  { id: "limpieza", label: "Limpieza", emoji: "🧴", pasillo: 7 },
  { id: "otro", label: "Otro", emoji: "✨", pasillo: 8 },
];
const STORE_COLORS = ["#a8d5a2","#d4c87a","#7ab8d4","#d4a84a","#c4a8d4","#d4a8a8"];
const STORE_EMOJIS = ["🏪","🏬","🛒","🌿","🥩","🧴","🍞","🏷️"];

const genId = () => crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9);
const todayISO = () => new Date().toISOString();
const daysBetween = (a, b) => Math.round(Math.abs(new Date(a) - new Date(b)) / 86400000);

function predictNext(dates) {
  if (!dates || dates.length < 2) return null;
  const sorted = [...dates].sort();
  const gaps = [];
  for (let i = 1; i < sorted.length; i++) gaps.push(daysBetween(sorted[i], sorted[i - 1]));
  const avg = Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length);
  const last = new Date(sorted[sorted.length - 1]);
  last.setDate(last.getDate() + avg);
  return { date: last.toISOString().split("T")[0], avgGap: avg, daysUntil: Math.round((last - new Date()) / 86400000) };
}

// ─── UI ATOMS ─────────────────────────────────────────────────────────────────
function Tag({ color, children, small }) {
  return <span style={{ background: color + "20", color, border: `1px solid ${color}40`, borderRadius: "20px", padding: small ? "1px 8px" : "3px 10px", fontSize: small ? "10px" : "12px", fontWeight: 600, whiteSpace: "nowrap", display: "inline-block" }}>{children}</span>;
}

function Btn({ children, color = T.accent, outline, small, full, style: s, ...props }) {
  const [hov, setHov] = useState(false);
  return (
    <button {...props} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background: outline ? (hov ? color + "18" : "transparent") : color, color: outline ? color : "#0c110e", border: `1.5px solid ${color}`, borderRadius: "12px", padding: small ? "6px 14px" : "11px 22px", fontSize: small ? "12px" : "14px", fontWeight: 700, cursor: "pointer", fontFamily: T.font, letterSpacing: "0.02em", transition: "all 0.15s", width: full ? "100%" : "auto", opacity: props.disabled ? 0.5 : 1, ...(s || {}) }}>
      {children}
    </button>
  );
}

function Modal({ open, onClose, children, title, color = T.accent, wide }) {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 999, background: "rgba(8,12,8,0.92)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }} onClick={onClose}>
      <div style={{ background: T.card, borderRadius: "20px", padding: "24px", width: "100%", maxWidth: wide ? "600px" : "460px", border: `1.5px solid ${color}44`, maxHeight: "92vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
          <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color, letterSpacing: "0.02em" }}>{title}</h3>
          <button onClick={onClose} style={{ background: T.card2, border: "none", color: T.textMuted, cursor: "pointer", borderRadius: "50%", width: "28px", height: "28px", fontSize: "15px", fontFamily: T.font }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function FInput({ label, ...props }) {
  const [foc, setFoc] = useState(false);
  return (
    <div style={{ marginBottom: "12px" }}>
      {label && <label style={{ display: "block", color: T.textMuted, fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", marginBottom: "5px", textTransform: "uppercase" }}>{label}</label>}
      <input {...props} onFocus={e => { setFoc(true); props.onFocus?.(e); }} onBlur={e => { setFoc(false); props.onBlur?.(e); }}
        style={{ width: "100%", background: T.card2, border: `1.5px solid ${foc ? T.accent : T.border}`, borderRadius: "10px", padding: "9px 12px", color: T.text, fontSize: "14px", outline: "none", boxSizing: "border-box", fontFamily: T.font, transition: "border-color 0.2s", ...(props.style || {}) }} />
    </div>
  );
}

function FSelect({ label, children, ...props }) {
  return (
    <div style={{ marginBottom: "12px" }}>
      {label && <label style={{ display: "block", color: T.textMuted, fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", marginBottom: "5px", textTransform: "uppercase" }}>{label}</label>}
      <select {...props} style={{ width: "100%", background: T.card2, border: `1.5px solid ${T.border}`, borderRadius: "10px", padding: "9px 12px", color: T.text, fontSize: "14px", outline: "none", boxSizing: "border-box", fontFamily: T.font, cursor: "pointer" }}>{children}</select>
    </div>
  );
}

function Toast({ msg, color }) {
  return <div style={{ position: "fixed", bottom: "24px", left: "50%", transform: "translateX(-50%)", background: color, color: "#0c110e", borderRadius: "30px", padding: "10px 22px", fontWeight: 700, fontSize: "13px", zIndex: 2000, boxShadow: `0 8px 30px ${color}55`, whiteSpace: "nowrap", animation: "slideup 0.3s ease" }}>{msg}</div>;
}

// ─── AUTH SCREEN ──────────────────────────────────────────────────────────────
function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [householdName, setHouseholdName] = useState("");
  const [joinMode, setJoinMode] = useState("create");
  const [householdId, setHouseholdId] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const handle = async () => {
    setLoading(true); setMsg("");
    try {
      if (mode === "login") {
        const res = await authApi.signIn(email, password);
        if (res.access_token) {
          onAuth({ token: res.access_token, userId: res.user.id });
        } else {
          setMsg("❌ " + (res.error_description || "Credenciales incorrectas"));
        }
      } else {
        const res = await authApi.signUp(email, password);
        if (res.user) {
          const token = res.access_token || SUPABASE_ANON_KEY;
          const userId = res.user.id;
          let hId = householdId;
          if (joinMode === "create") {
            const h = await sbInsert("households", token, { id: genId(), name: householdName || "Mi Casa" });
            hId = h?.id;
          }
          await sbInsert("profiles", token, { id: userId, household_id: hId, display_name: name || email.split("@")[0], avatar_emoji: "🙋‍♀️" });
          setMsg("✅ Cuenta creada. Confirma tu email y luego inicia sesión.");
        } else {
          setMsg("❌ " + (res.error_description || "Algo salió mal"));
        }
      }
    } catch (e) { setMsg("❌ Error de conexión"); }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", fontFamily: T.font }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Urbanist:wght@300;400;500;600;700;800&display=swap'); *{box-sizing:border-box;margin:0;padding:0;} input::placeholder{color:${T.textFaint};} select option{background:${T.card2};}`}</style>
      <div style={{ width: "100%", maxWidth: "380px" }}>
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div style={{ fontSize: "48px", marginBottom: "8px" }}>🛒</div>
          <h1 style={{ fontWeight: 800, fontSize: "32px", color: T.accent, letterSpacing: "-0.02em" }}>SuperPlus</h1>
          <p style={{ color: T.textMuted, fontSize: "13px", marginTop: "4px" }}>Tu lista familiar inteligente</p>
        </div>
        <div style={{ background: T.card, borderRadius: "20px", padding: "26px", border: `1.5px solid ${T.border}` }}>
          <div style={{ display: "flex", gap: "6px", marginBottom: "20px" }}>
            {["login", "signup"].map(m => (
              <button key={m} onClick={() => setMode(m)} style={{ flex: 1, padding: "9px", borderRadius: "10px", cursor: "pointer", fontFamily: T.font, fontWeight: 700, fontSize: "13px", border: "none", background: mode === m ? T.accent : T.card2, color: mode === m ? "#0c110e" : T.textMuted, transition: "all 0.2s" }}>
                {m === "login" ? "Entrar" : "Crear cuenta"}
              </button>
            ))}
          </div>
          {mode === "signup" && (
            <>
              <FInput label="Tu nombre" placeholder="Karla" value={name} onChange={e => setName(e.target.value)} />
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", color: T.textMuted, fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", marginBottom: "6px", textTransform: "uppercase" }}>¿Hogar?</label>
                <div style={{ display: "flex", gap: "6px" }}>
                  {[["create", "Crear nuevo"], ["join", "Unirme"]].map(([v, l]) => (
                    <button key={v} onClick={() => setJoinMode(v)} style={{ flex: 1, padding: "7px", borderRadius: "9px", cursor: "pointer", fontFamily: T.font, fontWeight: 700, fontSize: "12px", border: `1.5px solid ${joinMode === v ? T.accent2 : T.border}`, background: joinMode === v ? T.accent2 + "18" : "transparent", color: joinMode === v ? T.accent2 : T.textMuted }}>{l}</button>
                  ))}
                </div>
              </div>
              {joinMode === "create"
                ? <FInput label="Nombre del hogar" placeholder="Mi Casa 🏠" value={householdName} onChange={e => setHouseholdName(e.target.value)} />
                : <FInput label="ID del hogar (te lo da tu pareja)" placeholder="xxxxxxxx-xxxx-xxxx-xxxx" value={householdId} onChange={e => setHouseholdId(e.target.value)} />
              }
            </>
          )}
          <FInput label="Email" type="email" placeholder="karla@gmail.com" value={email} onChange={e => setEmail(e.target.value)} />
          <FInput label="Contraseña" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && handle()} />
          {msg && <div style={{ color: msg.startsWith("✅") ? T.done : T.danger, fontSize: "13px", marginBottom: "12px", fontWeight: 600 }}>{msg}</div>}
          <Btn color={T.accent} full onClick={handle} disabled={loading}>{loading ? "⏳ Un momento..." : mode === "login" ? "→ Entrar" : "✦ Crear cuenta"}</Btn>
        </div>
      </div>
    </div>
  );
}

// ─── QUICK ADD ────────────────────────────────────────────────────────────────
function QuickAddForm({ products, stores, householdId, onSave, onClose }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [mode, setMode] = useState("search");
  const [qty, setQty] = useState("1");
  const [unit, setUnit] = useState("");
  const [storeId, setStoreId] = useState("");
  const [price, setPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [addedBy, setAddedBy] = useState("");
  const [newName, setNewName] = useState("");
  const [newBrand, setNewBrand] = useState("");
  const [newCat, setNewCat] = useState("abarrotes");
  const [dupWarning, setDupWarning] = useState(null);

  const matches = query.length > 1 ? products.filter(p => p.name.toLowerCase().includes(query.toLowerCase()) || (p.brand || "").toLowerCase().includes(query.toLowerCase())) : [];

  const selectProduct = (p) => { setSelected(p); setQty(String(p.default_qty || 1)); setUnit(p.default_unit || ""); setStoreId(p.default_store_id || ""); setPrice(String(p.avg_price || "")); setQuery(p.name); };

  const checkDup = (n) => { const d = products.find(p => p.name.toLowerCase() === n.toLowerCase()); setDupWarning(d || null); };

  const handleSave = (isNew) => {
    const prodId = isNew ? genId() : selected?.id;
    const newProd = isNew ? { id: prodId, name: newName, brand: newBrand, presentation: "", default_qty: parseFloat(qty) || 1, default_unit: unit, default_store_id: storeId || null, category: newCat, barcode: "", avg_price: price ? parseFloat(price) : null, household_id: householdId } : null;
    const item = { id: genId(), product_id: prodId, added_by: addedBy, store_id: storeId || null, qty: parseFloat(qty) || 1, unit, estimated_price: price ? parseFloat(price) : null, notes, done: false, added_at: todayISO(), household_id: householdId };
    onSave({ product: newProd, item, isNew });
    onClose();
  };

  return (
    <div>
      {mode === "search" && (
        <>
          <div style={{ position: "relative", marginBottom: "12px" }}>
            <input placeholder="🔍 Buscar o escribir producto nuevo..." value={query} onChange={e => { setQuery(e.target.value); setSelected(null); if (e.target.value.length > 1) checkDup(e.target.value); }}
              style={{ width: "100%", background: T.card2, border: `1.5px solid ${T.accent}`, borderRadius: "10px", padding: "11px 14px", color: T.text, fontSize: "14px", outline: "none", boxSizing: "border-box", fontFamily: T.font }} />
            {matches.length > 0 && !selected && (
              <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: T.card3, border: `1.5px solid ${T.border}`, borderRadius: "10px", zIndex: 10, overflow: "hidden", marginTop: "4px", boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}>
                {matches.slice(0, 5).map(p => (
                  <div key={p.id} onClick={() => selectProduct(p)} style={{ padding: "10px 14px", cursor: "pointer", display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${T.border}` }}
                    onMouseEnter={e => e.currentTarget.style.background = T.card2} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <div><div style={{ fontWeight: 600, fontSize: "14px" }}>{p.name}</div>{p.brand && <div style={{ fontSize: "11px", color: T.textMuted }}>{p.brand}</div>}</div>
                    {p.avg_price && <span style={{ color: T.accent, fontWeight: 700, fontSize: "12px" }}>${p.avg_price}</span>}
                  </div>
                ))}
                <div onClick={() => { setMode("new"); setNewName(query); }} style={{ padding: "10px 14px", cursor: "pointer", color: T.accent2, fontWeight: 700, fontSize: "13px" }}
                  onMouseEnter={e => e.currentTarget.style.background = T.card2} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  ✚ Crear "{query}" como producto nuevo
                </div>
              </div>
            )}
          </div>
          {dupWarning && !selected && (
            <div style={{ background: T.warning + "18", border: `1px solid ${T.warning}44`, borderRadius: "10px", padding: "10px 13px", marginBottom: "12px", display: "flex", gap: "10px", alignItems: "center" }}>
              <span>⚠️</span>
              <div style={{ flex: 1 }}><div style={{ color: T.warning, fontWeight: 700, fontSize: "13px" }}>Posible duplicado</div><div style={{ color: T.textMuted, fontSize: "12px" }}>Ya existe "{dupWarning.name}"</div></div>
              <Btn small color={T.accent} onClick={() => selectProduct(dupWarning)}>Usar ese</Btn>
            </div>
          )}
          {!selected && query.length > 1 && matches.length === 0 && (
            <div onClick={() => { setMode("new"); setNewName(query); }} style={{ background: T.card2, border: `1.5px dashed ${T.accent}44`, borderRadius: "10px", padding: "12px", marginBottom: "12px", cursor: "pointer", textAlign: "center", color: T.accent, fontWeight: 700, fontSize: "13px" }}>
              ✚ Crear "{query}" como producto nuevo
            </div>
          )}
          {selected && <div style={{ background: T.card2, borderRadius: "10px", padding: "10px 13px", marginBottom: "12px", border: `1px solid ${T.accent}44` }}><div style={{ fontWeight: 700 }}>{selected.name}</div>{selected.brand && <div style={{ fontSize: "12px", color: T.textMuted }}>{selected.brand}</div>}</div>}
          {selected && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <FInput label="Cantidad" type="number" value={qty} onChange={e => setQty(e.target.value)} />
                <FInput label="Unidad" placeholder="kg, lt, pz…" value={unit} onChange={e => setUnit(e.target.value)} />
              </div>
              <FSelect label="Tienda" value={storeId} onChange={e => setStoreId(e.target.value)}>
                <option value="">— Sin tienda —</option>
                {stores.map(s => <option key={s.id} value={s.id}>{s.emoji} {s.name}</option>)}
              </FSelect>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <FInput label="Precio est. $" type="number" value={price} onChange={e => setPrice(e.target.value)} />
              </div>
              <FInput label="Notas" placeholder="Opcional…" value={notes} onChange={e => setNotes(e.target.value)} />
              <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "6px" }}>
                <Btn outline color={T.textMuted} onClick={onClose}>Cancelar</Btn>
                <Btn color={T.accent} onClick={() => handleSave(false)}>✦ Agregar</Btn>
              </div>
            </>
          )}
        </>
      )}
      {mode === "new" && (
        <>
          <div style={{ background: T.accent + "15", borderRadius: "10px", padding: "10px 13px", marginBottom: "14px", fontSize: "13px", color: T.accent, fontWeight: 600 }}>✚ Nuevo — se guardará en catálogo</div>
          <FInput label="Nombre *" value={newName} onChange={e => setNewName(e.target.value)} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <FInput label="Marca" value={newBrand} onChange={e => setNewBrand(e.target.value)} />
            <FInput label="Unidad" placeholder="kg, lt, pz…" value={unit} onChange={e => setUnit(e.target.value)} />
          </div>
          <FSelect label="Categoría" value={newCat} onChange={e => setNewCat(e.target.value)}>
            {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
          </FSelect>
          <FSelect label="Tienda" value={storeId} onChange={e => setStoreId(e.target.value)}>
            <option value="">— Sin tienda —</option>
            {stores.map(s => <option key={s.id} value={s.id}>{s.emoji} {s.name}</option>)}
          </FSelect>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <FInput label="Cantidad" type="number" value={qty} onChange={e => setQty(e.target.value)} />
            <FInput label="Precio est. $" type="number" value={price} onChange={e => setPrice(e.target.value)} />
          </div>
          <FInput label="Notas" placeholder="Opcional…" value={notes} onChange={e => setNotes(e.target.value)} />
          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "6px" }}>
            <Btn outline color={T.textMuted} onClick={() => setMode("search")}>← Volver</Btn>
            <Btn color={T.accent2} onClick={() => handleSave(true)}>✦ Crear y agregar</Btn>
          </div>
        </>
      )}
    </div>
  );
}

// ─── TICKET SCANNER ───────────────────────────────────────────────────────────
function TicketScanner({ products, onMatch, onClose }) {
  const [step, setStep] = useState("upload");
  const [imgPreview, setImgPreview] = useState(null);
  const [parsedItems, setParsedItems] = useState([]);
  const [unmatched, setUnmatched] = useState([]);
  const [newProdIdx, setNewProdIdx] = useState(0);
  const [newProdForm, setNewProdForm] = useState(null);
  const fileRef = useRef();

  const handleFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => { setImgPreview(e.target.result); setStep("processing"); simulateOCR(file); };
    reader.readAsDataURL(file);
  };

  const simulateOCR = () => {
    setTimeout(() => {
      const ticketItems = [
        { raw: "LECHE LALA 1L x2", price: 48.5, qty: 2 },
        { raw: "AGUACATE HASS x4", price: 65.0, qty: 4 },
        { raw: "POLLO PECHUGA 1KG", price: 125.0, qty: 1 },
        { raw: "DETERGENTE ARIEL 1KG", price: 89.0, qty: 1 },
        { raw: "YOGUR FAGE 500G x2", price: 37.0, qty: 2 },
        { raw: "CEREAL FITNESS 500G", price: 68.0, qty: 1 },
      ];
      const matched = ticketItems.map(item => {
        const prod = products.find(p => item.raw.toLowerCase().includes(p.name.toLowerCase().split(" ")[0]) || (p.brand && item.raw.toLowerCase().includes(p.brand.toLowerCase())));
        return { ...item, matched: prod || null };
      });
      const um = matched.filter(i => !i.matched);
      setParsedItems(matched);
      setUnmatched(um);
      if (um.length > 0) setNewProdForm({ name: um[0].raw, brand: "", category: "abarrotes", price: um[0].price });
      setStep("results");
    }, 2000);
  };

  return (
    <div>
      {step === "upload" && (
        <div>
          <p style={{ color: T.textMuted, fontSize: "13px", marginBottom: "16px" }}>Sube una foto de tu ticket. La IA leerá productos y precios automáticamente.</p>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" }}>
            <button onClick={() => { fileRef.current.setAttribute("capture", "environment"); fileRef.current.click(); }} style={{ background: T.card2, border: `1.5px dashed ${T.accent}55`, borderRadius: "12px", padding: "18px", cursor: "pointer", color: T.text, fontFamily: T.font, display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "28px" }}>📷</span><span style={{ fontWeight: 700, fontSize: "13px" }}>Tomar foto</span>
            </button>
            <button onClick={() => { fileRef.current.removeAttribute("capture"); fileRef.current.click(); }} style={{ background: T.card2, border: `1.5px dashed ${T.accent2}55`, borderRadius: "12px", padding: "18px", cursor: "pointer", color: T.text, fontFamily: T.font, display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "28px" }}>🖼️</span><span style={{ fontWeight: 700, fontSize: "13px" }}>Desde galería</span>
            </button>
          </div>
          <div style={{ textAlign: "center" }}><Btn outline color={T.textMuted} onClick={onClose}>Cancelar</Btn></div>
        </div>
      )}
      {step === "processing" && (
        <div style={{ textAlign: "center", padding: "28px 20px" }}>
          {imgPreview && <img src={imgPreview} alt="" style={{ width: "100%", maxHeight: "160px", objectFit: "cover", borderRadius: "10px", marginBottom: "18px", opacity: 0.6 }} />}
          <div style={{ fontSize: "36px", marginBottom: "12px", animation: "spin 1.5s linear infinite" }}>⚙️</div>
          <div style={{ fontWeight: 700, color: T.accent }}>Leyendo ticket...</div>
          <div style={{ color: T.textMuted, fontSize: "13px", marginTop: "4px" }}>Identificando productos y precios</div>
        </div>
      )}
      {step === "results" && (
        <div>
          {imgPreview && <img src={imgPreview} alt="" style={{ width: "100%", maxHeight: "100px", objectFit: "cover", borderRadius: "10px", marginBottom: "14px", opacity: 0.5 }} />}
          <div style={{ display: "flex", gap: "8px", marginBottom: "14px" }}>
            {[{ v: parsedItems.filter(i => i.matched).length, l: "ENCONTRADOS", c: T.done }, { v: unmatched.length, l: "NUEVOS", c: T.warning }, { v: `$${parsedItems.reduce((s, i) => s + i.price * i.qty, 0).toFixed(0)}`, l: "TOTAL", c: T.accent }].map(x => (
              <div key={x.l} style={{ background: x.c + "18", border: `1px solid ${x.c}33`, borderRadius: "10px", padding: "8px", flex: 1, textAlign: "center" }}>
                <div style={{ fontWeight: 800, fontSize: "18px", color: x.c }}>{x.v}</div>
                <div style={{ fontSize: "9px", color: T.textMuted, fontWeight: 700 }}>{x.l}</div>
              </div>
            ))}
          </div>
          <div style={{ marginBottom: "12px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: T.textMuted, letterSpacing: "0.08em", marginBottom: "6px" }}>✅ ENCONTRADOS</div>
            {parsedItems.filter(i => i.matched).map((item, i) => (
              <div key={i} style={{ background: T.card2, borderRadius: "8px", padding: "8px 12px", display: "flex", justifyContent: "space-between", marginBottom: "4px", border: `1px solid ${T.done}22` }}>
                <div><div style={{ fontWeight: 600, fontSize: "13px" }}>{item.matched.name}</div><div style={{ fontSize: "11px", color: T.textMuted }}>{item.raw}</div></div>
                <div style={{ textAlign: "right" }}><div style={{ color: T.done, fontWeight: 800, fontSize: "13px" }}>${item.price}</div><div style={{ fontSize: "10px", color: T.textMuted }}>×{item.qty}</div></div>
              </div>
            ))}
          </div>
          {unmatched.length > 0 && newProdForm && (
            <div style={{ background: T.warning + "12", border: `1.5px solid ${T.warning}44`, borderRadius: "12px", padding: "14px", marginBottom: "12px" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: T.warning, letterSpacing: "0.08em", marginBottom: "8px" }}>⚠️ PRODUCTO NUEVO ({newProdIdx + 1}/{unmatched.length})</div>
              <div style={{ color: T.textMuted, fontSize: "12px", marginBottom: "10px" }}>Del ticket: <strong style={{ color: T.text }}>{unmatched[newProdIdx].raw}</strong></div>
              <FInput label="Nombre" value={newProdForm.name} onChange={e => setNewProdForm(f => ({ ...f, name: e.target.value }))} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <FInput label="Marca" value={newProdForm.brand} onChange={e => setNewProdForm(f => ({ ...f, brand: e.target.value }))} />
                <FSelect label="Categoría" value={newProdForm.category} onChange={e => setNewProdForm(f => ({ ...f, category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
                </FSelect>
              </div>
              <div style={{ display: "flex", gap: "6px" }}>
                <Btn small outline color={T.textMuted} onClick={() => { if (newProdIdx < unmatched.length - 1) { setNewProdIdx(i => i + 1); setNewProdForm({ name: unmatched[newProdIdx + 1].raw, brand: "", category: "abarrotes" }); } else setNewProdForm(null); }}>Saltar</Btn>
                <Btn small color={T.accent2} onClick={() => { if (newProdIdx < unmatched.length - 1) { setNewProdIdx(i => i + 1); setNewProdForm({ name: unmatched[newProdIdx + 1].raw, brand: "", category: "abarrotes" }); } else setNewProdForm(null); }}>Guardar →</Btn>
              </div>
            </div>
          )}
          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
            <Btn outline color={T.textMuted} onClick={onClose}>Cancelar</Btn>
            <Btn color={T.accent} onClick={() => { onMatch(parsedItems.filter(i => i.matched)); onClose(); }}>✦ Actualizar precios</Btn>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SHOPPING MODE ────────────────────────────────────────────────────────────
function ShoppingMode({ items, products, stores, onToggle, onExit }) {
  const [sortBy, setSortBy] = useState("pasillo");
  const pending = items.filter(i => !i.done);
  const done = items.filter(i => i.done);

  const sorted = [...pending].sort((a, b) => {
    const pa = products.find(p => p.id === a.product_id);
    const pb = products.find(p => p.id === b.product_id);
    if (sortBy === "pasillo") {
      const ca = CATEGORIES.find(c => c.id === pa?.category)?.pasillo || 99;
      const cb = CATEGORIES.find(c => c.id === pb?.category)?.pasillo || 99;
      return ca - cb;
    }
    if (sortBy === "tienda") return (a.store_id || "z").localeCompare(b.store_id || "z");
    return (pa?.name || "").localeCompare(pb?.name || "");
  });

  const grouped = sorted.reduce((acc, item) => {
    const prod = products.find(p => p.id === item.product_id);
    const cat = CATEGORIES.find(c => c.id === prod?.category);
    const key = cat ? `${cat.emoji} ${cat.label}` : "✨ Otro";
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: T.font, color: T.text }}>
      <div style={{ background: "#0a0f0a", borderBottom: `2px solid ${T.accent}44`, padding: "14px 16px", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
          <div><div style={{ fontWeight: 800, fontSize: "18px", color: T.accent }}>🛒 Modo Compra</div><div style={{ fontSize: "12px", color: T.textMuted }}>{pending.length} pendientes · {done.length} en carrito</div></div>
          <Btn small outline color={T.textMuted} onClick={onExit}>✕ Salir</Btn>
        </div>
        <div style={{ background: T.card2, borderRadius: "6px", height: "6px", overflow: "hidden", marginBottom: "10px" }}>
          <div style={{ width: `${items.length > 0 ? (done.length / items.length) * 100 : 0}%`, height: "100%", background: `linear-gradient(90deg, ${T.accent}88, ${T.accent})`, borderRadius: "6px", transition: "width 0.4s" }} />
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          {[["pasillo", "Por pasillo"], ["tienda", "Por tienda"], ["az", "A–Z"]].map(([v, l]) => (
            <button key={v} onClick={() => setSortBy(v)} style={{ background: sortBy === v ? T.accent + "20" : "transparent", color: sortBy === v ? T.accent : T.textMuted, border: `1px solid ${sortBy === v ? T.accent + "44" : T.border}`, borderRadius: "8px", padding: "4px 10px", fontSize: "11px", fontWeight: 700, cursor: "pointer", fontFamily: T.font }}>{l}</button>
          ))}
        </div>
      </div>
      <div style={{ padding: "16px" }}>
        {Object.entries(grouped).map(([group, groupItems]) => (
          <div key={group} style={{ marginBottom: "18px" }}>
            <div style={{ fontSize: "12px", fontWeight: 700, color: T.textMuted, letterSpacing: "0.1em", marginBottom: "8px", textTransform: "uppercase" }}>{group}</div>
            {groupItems.map(item => {
              const prod = products.find(p => p.id === item.product_id);
              const store = stores.find(s => s.id === item.store_id);
              return (
                <button key={item.id} onClick={() => onToggle(item)} style={{ background: T.card, border: `1.5px solid ${T.border}`, borderRadius: "14px", padding: "14px 16px", display: "flex", alignItems: "center", gap: "12px", cursor: "pointer", fontFamily: T.font, textAlign: "left", width: "100%", marginBottom: "6px", transition: "all 0.2s" }}>
                  <div style={{ width: "26px", height: "26px", borderRadius: "50%", border: `2px solid ${T.accent}`, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: "16px", color: T.text }}>{prod?.name}</div>
                    <div style={{ fontSize: "13px", color: T.textMuted, marginTop: "2px" }}>{item.qty} {item.unit}{store && ` · ${store.emoji} ${store.name}`}</div>
                  </div>
                  {item.estimated_price && <div style={{ color: T.accent, fontWeight: 800, fontSize: "15px" }}>${(item.estimated_price * item.qty).toFixed(0)}</div>}
                </button>
              );
            })}
          </div>
        ))}
        {done.length > 0 && (
          <div>
            <div style={{ fontSize: "11px", fontWeight: 700, color: T.textFaint, letterSpacing: "0.1em", marginBottom: "8px" }}>✅ EN CARRITO</div>
            {done.map(item => {
              const prod = products.find(p => p.id === item.product_id);
              return (
                <button key={item.id} onClick={() => onToggle(item)} style={{ background: "transparent", border: `1px solid ${T.border}`, borderRadius: "12px", padding: "10px 14px", display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontFamily: T.font, opacity: 0.45, width: "100%", marginBottom: "5px" }}>
                  <div style={{ width: "22px", height: "22px", borderRadius: "50%", background: T.done, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", color: "#0c110e", fontWeight: 800 }}>✓</div>
                  <span style={{ textDecoration: "line-through", color: T.textMuted, fontSize: "15px" }}>{prod?.name}</span>
                </button>
              );
            })}
          </div>
        )}
        {pending.length === 0 && (
          <div style={{ textAlign: "center", padding: "50px 20px" }}>
            <div style={{ fontSize: "52px", marginBottom: "12px" }}>🎉</div>
            <div style={{ fontWeight: 800, fontSize: "22px", color: T.accent }}>¡Lista completa!</div>
            <div style={{ color: T.textMuted, marginTop: "6px", marginBottom: "20px" }}>Todo en el carrito</div>
            <Btn color={T.accent} onClick={onExit}>← Volver a la app</Btn>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [auth, setAuth] = useState(null);
  const [profile, setProfile] = useState(null);
  const [tab, setTab] = useState("lista");
  const [stores, setStores] = useState([]);
  const [products, setProducts] = useState([]);
  const [list, setList] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStore, setFilterStore] = useState("all");
  const [filterCat, setFilterCat] = useState("all");
  const [shoppingMode, setShoppingMode] = useState(false);
  const pollRef = useRef(null);

  const showToast = (msg, color = T.accent) => { setToast({ msg, color }); setTimeout(() => setToast(null), 2500); };

  const loadAll = useCallback(async (token, householdId) => {
    try {
      const [st, pr, sl, hi] = await Promise.all([
        sbGet("stores", token, [`household_id=eq.${householdId}`], "*", "created_at.asc"),
        sbGet("products", token, [`household_id=eq.${householdId}`], "*", "name.asc"),
        sbGet("shopping_list", token, [`household_id=eq.${householdId}`], "*", "added_at.desc"),
        sbGet("purchase_history", token, [`household_id=eq.${householdId}`], "*", "purchased_at.desc", 200),
      ]);
      setStores(st); setProducts(pr); setList(sl); setHistory(hi);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!auth || !profile) return;
    loadAll(auth.token, profile.household_id);
    pollRef.current = setInterval(() => loadAll(auth.token, profile.household_id), 8000);
    return () => clearInterval(pollRef.current);
  }, [auth, profile, loadAll]);

  const handleAuth = async ({ token, userId }) => {
    setAuth({ token, userId });
    const profiles = await sbGet("profiles", token, [`id=eq.${userId}`]);
    if (profiles[0]) setProfile(profiles[0]);
  };

  if (!auth) return <AuthScreen onAuth={handleAuth} />;
  if (!profile) return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: T.font }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Urbanist:wght@400;700;800&display=swap'); *{box-sizing:border-box;margin:0;padding:0;}`}</style>
      <div style={{ textAlign: "center", color: T.textMuted }}>
        <div style={{ fontSize: "40px", marginBottom: "12px" }}>⏳</div>
        <div style={{ fontWeight: 700 }}>Cargando perfil...</div>
        <div style={{ fontSize: "12px", marginTop: "8px", color: T.textFaint }}>Si acabas de crear tu cuenta, revisa tu email</div>
      </div>
    </div>
  );

  const getStore = id => stores.find(s => s.id === id);
  const getProduct = id => products.find(p => p.id === id);
  const getCat = id => CATEGORIES.find(c => c.id === id);

  const pending = list.filter(i => !i.done);
  const done = list.filter(i => i.done);
  const totalEst = pending.filter(i => i.estimated_price).reduce((s, i) => s + i.estimated_price * (i.qty || 1), 0);

  const purchaseDatesByProduct = history.reduce((acc, h) => { if (!acc[h.product_id]) acc[h.product_id] = []; acc[h.product_id].push(h.purchased_at); return acc; }, {});

  const suggestions = products.filter(p => {
    if (list.some(i => i.product_id === p.id && !i.done)) return false;
    const pred = predictNext(purchaseDatesByProduct[p.id]);
    return pred && pred.daysUntil <= 5;
  });

  const filtered = pending.filter(item => {
    const prod = getProduct(item.product_id);
    if (filterStore !== "all" && item.store_id !== filterStore) return false;
    if (filterCat !== "all" && prod?.category !== filterCat) return false;
    if (search && !prod?.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const toggleDone = async (item) => {
    const newDone = !item.done;
    setList(p => p.map(i => i.id === item.id ? { ...i, done: newDone } : i));
    await sbUpdate("shopping_list", auth.token, `id=eq.${item.id}`, { done: newDone, done_by: profile.id, done_at: newDone ? todayISO() : null });
    if (newDone && item.product_id) {
      const hrow = { id: genId(), household_id: profile.household_id, product_id: item.product_id, purchased_by: profile.id, store_id: item.store_id, qty: item.qty, unit: item.unit, actual_price: item.estimated_price, purchased_at: todayISO() };
      await sbInsert("purchase_history", auth.token, hrow);
      setHistory(h => [hrow, ...h]);
      showToast("✅ ¡Comprado!");
    }
  };

  const handleQuickAdd = async ({ product, item, isNew }) => {
    if (isNew && product) {
      await sbInsert("products", auth.token, product);
      setProducts(p => [...p, product]);
    }
    await sbInsert("shopping_list", auth.token, item);
    setList(p => [item, ...p]);
    showToast(isNew ? "✚ Producto creado y agregado" : "✦ Agregado a la lista");
  };

  const handleTicketMatch = async (matched) => {
    for (const item of matched) {
      const hrow = { id: genId(), household_id: profile.household_id, product_id: item.matched.id, purchased_by: profile.id, store_id: null, qty: item.qty, actual_price: item.price, purchased_at: todayISO() };
      await sbInsert("purchase_history", auth.token, hrow);
      setHistory(h => [hrow, ...h]);
      await sbUpdate("products", auth.token, `id=eq.${item.matched.id}`, { avg_price: item.price });
      setProducts(p => p.map(pr => pr.id === item.matched.id ? { ...pr, avg_price: item.price } : pr));
      const listItem = list.find(i => i.product_id === item.matched.id && !i.done);
      if (listItem) { await sbUpdate("shopping_list", auth.token, `id=eq.${listItem.id}`, { done: true, done_at: todayISO() }); setList(p => p.map(i => i.id === listItem.id ? { ...i, done: true } : i)); }
    }
    showToast(`✦ ${matched.length} precios actualizados`, T.accent2);
  };

  const tabs = [
    { id: "lista", label: "📋 Lista", color: T.accent },
    { id: "catalogo", label: "📦 Catálogo", color: T.accent2 },
    { id: "tiendas", label: "🏪 Tiendas", color: T.accent3 },
    { id: "predicciones", label: "🔮 Predicciones", color: "#c4a8d4" },
    { id: "historial", label: "📊 Historial", color: T.done },
  ];
  const activeColor = tabs.find(t => t.id === tab)?.color || T.accent;

  if (shoppingMode) return <ShoppingMode items={list} products={products} stores={stores} onToggle={toggleDone} onExit={() => setShoppingMode(false)} />;

  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: T.font, color: T.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Urbanist:wght@300;400;500;600;700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:4px;} ::-webkit-scrollbar-thumb{background:${T.border};border-radius:4px;}
        input::placeholder{color:${T.textFaint};} select option{background:${T.card2};}
        @keyframes pop{0%{transform:scale(0.96);opacity:0}100%{transform:scale(1);opacity:1}}
        @keyframes slideup{0%{transform:translateY(16px);opacity:0}100%{transform:translateY(0);opacity:1}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
        .icard:hover{transform:translateY(-1px);border-color:${T.borderLight} !important;}
        .icard{transition:transform 0.15s,border-color 0.15s;}
      `}</style>

      {toast && <Toast {...toast} />}

      {/* Header */}
      <div style={{ background: T.grad, borderBottom: `1.5px solid ${activeColor}33`, position: "sticky", top: 0, zIndex: 100, boxShadow: "0 4px 24px rgba(0,0,0,0.5)" }}>
        <div style={{ maxWidth: "900px", margin: "0 auto", padding: "0 16px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "14px", paddingBottom: "10px", flexWrap: "wrap", gap: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "26px", animation: "float 3s ease-in-out infinite", display: "block" }}>🛒</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: "24px", color: T.accent, letterSpacing: "-0.01em", lineHeight: 1 }}>SuperPlus</div>
                <div style={{ fontSize: "10px", color: T.textMuted, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase" }}>{profile.avatar_emoji} {profile.display_name}</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
              {suggestions.length > 0 && (
                <div style={{ background: T.accent2 + "20", border: `1px solid ${T.accent2}44`, borderRadius: "10px", padding: "5px 10px", cursor: "pointer" }} onClick={() => setTab("predicciones")}>
                  <div style={{ fontWeight: 800, fontSize: "16px", color: T.accent2, lineHeight: 1 }}>{suggestions.length}</div>
                  <div style={{ fontSize: "9px", color: T.accent2, fontWeight: 700, letterSpacing: "0.06em" }}>SUGERIDOS</div>
                </div>
              )}
              <div style={{ background: T.card2, borderRadius: "10px", padding: "5px 10px", border: `1px solid ${T.border}` }}>
                <div style={{ fontWeight: 800, fontSize: "16px", color: T.accent, lineHeight: 1 }}>{pending.length}</div>
                <div style={{ fontSize: "9px", color: T.textMuted, fontWeight: 700, letterSpacing: "0.06em" }}>PENDIENTES</div>
              </div>
              {totalEst > 0 && (
                <div style={{ background: T.card2, borderRadius: "10px", padding: "5px 10px", border: `1px solid ${T.border}` }}>
                  <div style={{ fontWeight: 800, fontSize: "16px", color: T.done, lineHeight: 1 }}>${totalEst.toFixed(0)}</div>
                  <div style={{ fontSize: "9px", color: T.textMuted, fontWeight: 700, letterSpacing: "0.06em" }}>ESTIMADO</div>
                </div>
              )}
              {/* Big CTA button */}
              <button onClick={() => setModal("quickAdd")} style={{ background: `linear-gradient(135deg, ${T.accent}, ${T.done})`, color: "#0c110e", border: "none", borderRadius: "14px", padding: "10px 20px", fontWeight: 800, fontSize: "15px", cursor: "pointer", fontFamily: T.font, boxShadow: `0 4px 20px ${T.accent}55`, display: "flex", alignItems: "center", gap: "6px", transition: "all 0.15s" }}
                onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"}
                onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}>
                <span style={{ fontSize: "18px" }}>＋</span> Agregar
              </button>
              <Btn small outline color={T.accent3} onClick={() => setModal("ticket")}>🧾 Ticket</Btn>
              <Btn small outline color={T.accent} onClick={() => setShoppingMode(true)}>🛒 Ir de compras</Btn>
            </div>
          </div>
          <div style={{ display: "flex", gap: "2px", overflowX: "auto" }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{ background: tab === t.id ? t.color + "15" : "transparent", color: tab === t.id ? t.color : T.textMuted, border: "none", borderBottom: `2px solid ${tab === t.id ? t.color : "transparent"}`, padding: "9px 14px", fontWeight: 700, fontSize: "12px", cursor: "pointer", fontFamily: T.font, transition: "all 0.2s", whiteSpace: "nowrap", letterSpacing: "0.03em" }}>{t.label}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "20px 16px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ fontSize: "40px", marginBottom: "12px", animation: "float 1.5s ease-in-out infinite" }}>🌿</div>
            <div style={{ color: T.textMuted, fontWeight: 600 }}>Cargando tu lista...</div>
          </div>
        ) : (
          <>
            {/* ── SUGGESTIONS ── */}
            {tab === "lista" && suggestions.length > 0 && (
              <div style={{ background: T.accent2 + "12", border: `1px solid ${T.accent2}33`, borderRadius: "14px", padding: "14px 16px", marginBottom: "16px" }}>
                <div style={{ fontWeight: 800, fontSize: "12px", color: T.accent2, marginBottom: "8px", letterSpacing: "0.06em", textTransform: "uppercase" }}>💡 Sugerencias basadas en tus compras</div>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {suggestions.map(prod => {
                    const pred = predictNext(purchaseDatesByProduct[prod.id]);
                    return (
                      <button key={prod.id} onClick={async () => {
                        const item = { id: genId(), product_id: prod.id, added_by: profile.id, store_id: prod.default_store_id, qty: prod.default_qty || 1, unit: prod.default_unit || "", estimated_price: prod.avg_price, notes: "", done: false, added_at: todayISO(), household_id: profile.household_id };
                        await sbInsert("shopping_list", auth.token, item);
                        setList(p => [item, ...p]);
                        showToast(`✦ ${prod.name} agregado`);
                      }} style={{ background: T.card2, border: `1px solid ${T.accent2}44`, borderRadius: "10px", padding: "7px 12px", cursor: "pointer", fontFamily: T.font, color: T.text, display: "flex", flexDirection: "column", alignItems: "flex-start", transition: "all 0.15s" }}>
                        <div style={{ fontWeight: 700, fontSize: "13px" }}>{prod.name}</div>
                        <div style={{ fontSize: "10px", color: pred && pred.daysUntil <= 0 ? T.danger : T.accent2, fontWeight: 600 }}>{pred ? (pred.daysUntil <= 0 ? "¡Ya se agotó!" : `En ${pred.daysUntil}d`) : ""}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── LISTA ── */}
            {tab === "lista" && (
              <div style={{ animation: "pop 0.2s ease" }}>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "14px" }}>
                  <input placeholder="🔍 Buscar..." value={search} onChange={e => setSearch(e.target.value)} style={{ background: T.card, border: `1.5px solid ${T.border}`, borderRadius: "10px", padding: "8px 12px", color: T.text, fontSize: "13px", outline: "none", width: "140px", fontFamily: T.font }} />
                  <select value={filterStore} onChange={e => setFilterStore(e.target.value)} style={{ background: T.card, border: `1.5px solid ${T.border}`, borderRadius: "10px", padding: "8px 11px", color: T.text, fontSize: "13px", outline: "none", cursor: "pointer", fontFamily: T.font }}>
                    <option value="all">🏪 Tienda</option>
                    {stores.map(s => <option key={s.id} value={s.id}>{s.emoji} {s.name}</option>)}
                  </select>
                  <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ background: T.card, border: `1.5px solid ${T.border}`, borderRadius: "10px", padding: "8px 11px", color: T.text, fontSize: "13px", outline: "none", cursor: "pointer", fontFamily: T.font }}>
                    <option value="all">✨ Categoría</option>
                    {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
                  </select>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
                  {filtered.length === 0 && (
                    <div style={{ textAlign: "center", padding: "50px 20px" }}>
                      <div style={{ fontSize: "52px", marginBottom: "12px", animation: "float 2s ease-in-out infinite" }}>🌿</div>
                      <div style={{ fontWeight: 800, fontSize: "22px", color: T.accent }}>Lista vacía</div>
                      <div style={{ color: T.textMuted, marginTop: "4px" }}>Toca ＋ Agregar para empezar</div>
                    </div>
                  )}
                  {filtered.map(item => {
                    const prod = getProduct(item.product_id);
                    const store = getStore(item.store_id);
                    const cat = getCat(prod?.category);
                    return (
                      <div key={item.id} className="icard" style={{ background: T.card, borderRadius: "14px", padding: "13px 15px", border: `1.5px solid ${T.border}`, display: "flex", alignItems: "flex-start", gap: "12px" }}>
                        <button onClick={() => toggleDone(item)} style={{ width: "22px", height: "22px", borderRadius: "50%", flexShrink: 0, marginTop: "2px", border: `2px solid ${T.accent}`, background: "transparent", cursor: "pointer", transition: "all 0.2s" }}
                          onMouseEnter={e => e.currentTarget.style.background = T.accent + "30"} onMouseLeave={e => e.currentTarget.style.background = "transparent"} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: "15px" }}>{prod?.name}</div>
                          {prod?.brand && <div style={{ fontSize: "12px", color: T.textMuted, marginTop: "1px" }}>{prod.brand}{prod.presentation && ` · ${prod.presentation}`}</div>}
                          <div style={{ display: "flex", gap: "5px", marginTop: "6px", flexWrap: "wrap", alignItems: "center" }}>
                            <span style={{ color: T.textMuted, fontSize: "13px" }}>{item.qty} {item.unit}</span>
                            {cat && <Tag color={T.accent} small>{cat.emoji} {cat.label}</Tag>}
                            {store && <Tag color={store.color} small>{store.emoji} {store.name}</Tag>}
                            {item.estimated_price && <span style={{ color: T.done, fontWeight: 800, fontSize: "13px" }}>${(item.estimated_price * item.qty).toFixed(0)}</span>}
                            {item.notes && <span style={{ color: T.textFaint, fontSize: "11px", fontStyle: "italic" }}>"{item.notes}"</span>}
                          </div>
                        </div>
                        <Btn small outline color={T.danger} onClick={async () => { await sbDelete("shopping_list", auth.token, `id=eq.${item.id}`); setList(p => p.filter(i => i.id !== item.id)); }}>🗑</Btn>
                      </div>
                    );
                  })}
                </div>
                {done.length > 0 && (
                  <div style={{ marginTop: "20px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                      <div style={{ color: T.textFaint, fontWeight: 700, fontSize: "11px", letterSpacing: "0.1em" }}>✅ COMPLETADOS ({done.length})</div>
                      <Btn small outline color={T.textMuted} onClick={async () => { for (const i of done) await sbDelete("shopping_list", auth.token, `id=eq.${i.id}`); setList(p => p.filter(i => !i.done)); }}>Limpiar</Btn>
                    </div>
                    {done.map(item => {
                      const prod = getProduct(item.product_id);
                      return (
                        <div key={item.id} style={{ background: "transparent", borderRadius: "10px", padding: "8px 13px", border: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: "10px", opacity: 0.5, marginBottom: "5px" }}>
                          <button onClick={() => toggleDone(item)} style={{ width: "20px", height: "20px", borderRadius: "50%", flexShrink: 0, border: `2px solid ${T.done}`, background: T.done, cursor: "pointer", fontSize: "10px", color: "#0c110e", fontWeight: 800 }}>✓</button>
                          <span style={{ textDecoration: "line-through", color: T.textMuted, fontSize: "14px" }}>{prod?.name}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── CATÁLOGO ── */}
            {tab === "catalogo" && (
              <div style={{ animation: "pop 0.2s ease" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <div><h2 style={{ fontWeight: 800, fontSize: "22px", color: T.accent2 }}>Catálogo 📦</h2><p style={{ color: T.textMuted, fontSize: "13px", marginTop: "3px" }}>Configura una vez, usa siempre</p></div>
                  <Btn small color={T.accent2} onClick={() => setModal("quickAdd")}>+ Nuevo</Btn>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "10px" }}>
                  {products.map(prod => {
                    const cat = getCat(prod.category);
                    const store = getStore(prod.default_store_id);
                    const pred = predictNext(purchaseDatesByProduct[prod.id]);
                    return (
                      <div key={prod.id} className="icard" style={{ background: T.card, borderRadius: "14px", padding: "15px", border: `1.5px solid ${T.border}` }}>
                        <div style={{ fontWeight: 700, fontSize: "15px" }}>{prod.name}</div>
                        {prod.brand && <div style={{ color: T.textMuted, fontSize: "12px", marginTop: "2px" }}>{prod.brand}{prod.presentation && ` · ${prod.presentation}`}</div>}
                        {prod.barcode && <div style={{ color: T.textFaint, fontSize: "11px", marginTop: "2px" }}>📦 {prod.barcode}</div>}
                        <div style={{ display: "flex", gap: "4px", marginTop: "8px", flexWrap: "wrap" }}>
                          {cat && <Tag color={T.accent} small>{cat.emoji}</Tag>}
                          {store && <Tag color={store.color} small>{store.emoji}</Tag>}
                          {prod.avg_price && <Tag color={T.done} small>${prod.avg_price}</Tag>}
                          {pred && <Tag color={pred.daysUntil <= 7 ? T.warning : T.textMuted} small>~{pred.avgGap}d</Tag>}
                        </div>
                        <Btn small color={T.accent} style={{ marginTop: "10px" }} onClick={async () => {
                          const item = { id: genId(), product_id: prod.id, added_by: profile.id, store_id: prod.default_store_id, qty: prod.default_qty || 1, unit: prod.default_unit || "", estimated_price: prod.avg_price, notes: "", done: false, added_at: todayISO(), household_id: profile.household_id };
                          await sbInsert("shopping_list", auth.token, item);
                          setList(p => [item, ...p]);
                          showToast(`✦ ${prod.name} agregado`);
                        }}>+ Lista</Btn>
                      </div>
                    );
                  })}
                  {products.length === 0 && <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "50px", color: T.textMuted }}>
                    <div style={{ fontSize: "40px", marginBottom: "10px" }}>📦</div>
                    <div style={{ fontWeight: 700 }}>Sin productos aún</div>
                    <div style={{ fontSize: "13px", marginTop: "4px" }}>Agrega el primero con el botón ＋ Agregar</div>
                  </div>}
                </div>
              </div>
            )}

            {/* ── TIENDAS ── */}
            {tab === "tiendas" && (
              <div style={{ animation: "pop 0.2s ease" }}>
                <h2 style={{ fontWeight: 800, fontSize: "22px", color: T.accent3, marginBottom: "16px" }}>Tiendas 🏪</h2>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "10px", marginBottom: "24px" }}>
                  {stores.map(store => {
                    const si = pending.filter(i => i.store_id === store.id);
                    const total = si.filter(i => i.estimated_price).reduce((s, i) => s + i.estimated_price * i.qty, 0);
                    return (
                      <div key={store.id} className="icard" style={{ background: T.card, borderRadius: "16px", padding: "16px", border: `1.5px solid ${store.color}33`, position: "relative", overflow: "hidden" }}>
                        <div style={{ position: "absolute", bottom: "-8px", right: "-4px", fontSize: "54px", opacity: 0.06 }}>{store.emoji}</div>
                        <div style={{ fontSize: "26px", marginBottom: "8px" }}>{store.emoji}</div>
                        <div style={{ fontWeight: 800, fontSize: "16px", color: store.color }}>{store.name}</div>
                        <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                          <div style={{ background: store.color + "18", borderRadius: "8px", padding: "5px 8px", flex: 1, textAlign: "center" }}>
                            <div style={{ fontWeight: 800, fontSize: "18px", color: store.color }}>{si.length}</div>
                            <div style={{ fontSize: "9px", color: T.textMuted, fontWeight: 700 }}>ÍTEMS</div>
                          </div>
                          {total > 0 && <div style={{ background: T.done + "15", borderRadius: "8px", padding: "5px 8px", flex: 1, textAlign: "center" }}>
                            <div style={{ fontWeight: 800, fontSize: "18px", color: T.done }}>${total.toFixed(0)}</div>
                            <div style={{ fontSize: "9px", color: T.textMuted, fontWeight: 700 }}>EST.</div>
                          </div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* Household ID */}
                <div style={{ background: T.card, borderRadius: "14px", padding: "16px", border: `1px solid ${T.accent3}33` }}>
                  <div style={{ fontWeight: 700, color: T.accent3, fontSize: "13px", marginBottom: "6px" }}>🔗 Comparte tu hogar con tu pareja</div>
                  <div style={{ background: T.card2, borderRadius: "8px", padding: "10px 12px", fontFamily: "monospace", fontSize: "12px", color: T.textMuted, wordBreak: "break-all" }}>{profile.household_id}</div>
                  <div style={{ fontSize: "11px", color: T.textFaint, marginTop: "6px" }}>Tu pareja lo necesita al crear su cuenta para unirse a tu hogar</div>
                </div>
              </div>
            )}

            {/* ── PREDICCIONES ── */}
            {tab === "predicciones" && (
              <div style={{ animation: "pop 0.2s ease" }}>
                <div style={{ marginBottom: "18px" }}>
                  <h2 style={{ fontWeight: 800, fontSize: "22px", color: "#c4a8d4" }}>Predicciones 🔮</h2>
                  <p style={{ color: T.textMuted, fontSize: "13px", marginTop: "3px" }}>Aprende con cada compra que registras</p>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {products.filter(p => (purchaseDatesByProduct[p.id] || []).length >= 2)
                    .sort((a, b) => (predictNext(purchaseDatesByProduct[a.id])?.daysUntil || 999) - (predictNext(purchaseDatesByProduct[b.id])?.daysUntil || 999))
                    .map(prod => {
                      const pred = predictNext(purchaseDatesByProduct[prod.id]);
                      if (!pred) return null;
                      const color = pred.daysUntil <= 0 ? T.danger : pred.daysUntil <= 7 ? T.warning : pred.daysUntil <= 14 ? T.accent2 : T.done;
                      const progress = Math.max(0, Math.min(100, 100 - (pred.daysUntil / pred.avgGap) * 100));
                      const inList = list.some(i => i.product_id === prod.id && !i.done);
                      return (
                        <div key={prod.id} style={{ background: T.card, borderRadius: "14px", padding: "14px 16px", border: `1.5px solid ${color}28` }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: "15px" }}>{prod.name}</div>
                              <div style={{ fontSize: "12px", color: T.textMuted, marginTop: "2px" }}>Cada ~{pred.avgGap} días · {(purchaseDatesByProduct[prod.id] || []).length} compras</div>
                            </div>
                            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                              <Tag color={color}>{pred.daysUntil <= 0 ? "¡Ya!" : `En ${pred.daysUntil}d`}</Tag>
                              {!inList && <Btn small color={T.accent} onClick={async () => {
                                const item = { id: genId(), product_id: prod.id, added_by: profile.id, store_id: prod.default_store_id, qty: prod.default_qty || 1, unit: prod.default_unit || "", estimated_price: prod.avg_price, notes: "", done: false, added_at: todayISO(), household_id: profile.household_id };
                                await sbInsert("shopping_list", auth.token, item);
                                setList(p => [item, ...p]);
                                showToast(`✦ ${prod.name} agregado`);
                              }}>+ Lista</Btn>}
                              {inList && <Tag color={T.done}>✓ En lista</Tag>}
                            </div>
                          </div>
                          <div style={{ background: "#0a0f0a", borderRadius: "6px", height: "5px", marginTop: "12px", overflow: "hidden" }}>
                            <div style={{ width: `${progress}%`, height: "100%", background: `linear-gradient(90deg, ${color}66, ${color})`, borderRadius: "6px" }} />
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
                            <span style={{ fontSize: "10px", color: T.textFaint }}>Última: {new Date([...purchaseDatesByProduct[prod.id]].sort().at(-1)).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}</span>
                            <span style={{ fontSize: "10px", color, fontWeight: 600 }}>Próx: {pred.date}</span>
                          </div>
                        </div>
                      );
                    })}
                  {products.filter(p => (purchaseDatesByProduct[p.id] || []).length >= 2).length === 0 && (
                    <div style={{ textAlign: "center", padding: "50px 20px", color: T.textMuted }}>
                      <div style={{ fontSize: "44px", marginBottom: "12px" }}>🔮</div>
                      <div style={{ fontWeight: 700, fontSize: "18px", color: "#c4a8d4" }}>Pronto habrá predicciones</div>
                      <div style={{ fontSize: "13px", marginTop: "6px" }}>Completa 2+ compras del mismo producto</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── HISTORIAL ── */}
            {tab === "historial" && (
              <div style={{ animation: "pop 0.2s ease" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <div><h2 style={{ fontWeight: 800, fontSize: "22px", color: T.done }}>Historial 📊</h2><p style={{ color: T.textMuted, fontSize: "13px", marginTop: "3px" }}>{history.length} compras registradas</p></div>
                  <Btn small outline color={T.accent3} onClick={() => setModal("ticket")}>🧾 Escanear ticket</Btn>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "8px", marginBottom: "18px" }}>
                  {[
                    { label: "Gasto total", value: `$${history.filter(i => i.actual_price).reduce((s, i) => s + i.actual_price * (i.qty || 1), 0).toFixed(0)}`, color: T.done },
                    { label: "Compras", value: history.length, color: T.accent3 },
                    { label: "Productos", value: new Set(history.map(h => h.product_id)).size, color: T.accent },
                  ].map(card => (
                    <div key={card.label} style={{ background: T.card, borderRadius: "12px", padding: "12px", border: `1px solid ${card.color}33` }}>
                      <div style={{ fontWeight: 800, fontSize: "22px", color: card.color }}>{card.value}</div>
                      <div style={{ fontSize: "10px", color: T.textMuted, fontWeight: 700, marginTop: "2px", textTransform: "uppercase", letterSpacing: "0.06em" }}>{card.label}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {history.map((item, i) => {
                    const prod = getProduct(item.product_id);
                    const store = getStore(item.store_id);
                    const date = new Date(item.purchased_at);
                    return (
                      <div key={i} style={{ background: T.card, borderRadius: "12px", padding: "11px 14px", border: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ color: T.done, fontSize: "14px", flexShrink: 0 }}>✓</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: "14px" }}>{prod?.name || "Producto"}</div>
                          <div style={{ display: "flex", gap: "5px", marginTop: "4px", flexWrap: "wrap", alignItems: "center" }}>
                            {store && <Tag color={store.color} small>{store.emoji} {store.name}</Tag>}
                            <span style={{ color: T.textFaint, fontSize: "11px" }}>
                              {date.toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short", year: "numeric" })} · {date.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                            <span style={{ color: T.textMuted, fontSize: "11px" }}>{item.qty} {prod?.default_unit || "pz"}</span>
                          </div>
                        </div>
                        {item.actual_price && <span style={{ color: T.done, fontWeight: 800, fontSize: "14px", flexShrink: 0 }}>${(item.actual_price * (item.qty || 1)).toFixed(2)}</span>}
                      </div>
                    );
                  })}
                  {history.length === 0 && <div style={{ textAlign: "center", padding: "50px", color: T.textMuted }}>
                    <div style={{ fontSize: "40px", marginBottom: "10px" }}>📊</div>
                    <div style={{ fontWeight: 700 }}>Sin historial aún</div>
                  </div>}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* MODALS */}
      <Modal open={modal === "quickAdd"} onClose={() => setModal(null)} title="✦ Agregar ítem" color={T.accent}>
        <QuickAddForm products={products} stores={stores} householdId={profile.household_id} onSave={handleQuickAdd} onClose={() => setModal(null)} />
      </Modal>
      <Modal open={modal === "ticket"} onClose={() => setModal(null)} title="🧾 Escanear ticket" color={T.accent3} wide>
        <TicketScanner products={products} onMatch={handleTicketMatch} onClose={() => setModal(null)} />
      </Modal>
    </div>
  );
}
