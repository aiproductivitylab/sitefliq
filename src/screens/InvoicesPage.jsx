// Invoices (Step 6, F7) — lightweight agency bookkeeping: create an invoice for a
// client, export a clean professional PDF (via the browser print dialog — no extra
// dependency, no server cost), and mark it paid/unpaid. Invoices persist per user
// in Supabase (RLS + column-level grants, see 0004_invoices.sql). This is a simple
// document generator, NOT a tax/accounting or payments tool.
import { useEffect, useMemo, useState } from "react";
import { sb } from "../store";
import { theme as t } from "../ui/theme";
import { Container, Eyebrow, Heading, Text, Button, Card, Badge, Input, Field, MarketingNav } from "../ui/kit";

const CURRENCIES = { USD: "$", EUR: "€", GBP: "£", CAD: "$", AUD: "$" };

function money(n, cur = "USD") {
  const v = Number(n) || 0;
  return (CURRENCIES[cur] || "") + v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtDate(iso) {
  if (!iso) return "—";
  try { return new Date(iso + "T00:00:00").toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }); }
  catch { return iso; }
}
const STATUS_TONE = { paid: "accent", sent: "neutral", draft: "neutral" };
const emptyItem = () => ({ description: "", quantity: 1, unit_price: 0 });

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// Build a standalone, print-ready invoice document and open the browser print
// dialog (where the user can "Save as PDF"). Self-contained HTML — no network.
function printInvoice(inv, fromEmail) {
  const cur = inv.currency || "USD";
  const items = Array.isArray(inv.line_items) ? inv.line_items : [];
  const rows = items.map(it => `
    <tr>
      <td>${esc(it.description)}</td>
      <td class="num">${Number(it.quantity) || 0}</td>
      <td class="num">${money(it.unit_price, cur)}</td>
      <td class="num">${money((Number(it.quantity) || 0) * (Number(it.unit_price) || 0), cur)}</td>
    </tr>`).join("");
  const statusLabel = (inv.status || "draft").toUpperCase();
  const doc = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(inv.invoice_number || "Invoice")}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; color: #1b2435; margin: 0; padding: 48px; }
    .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #16181d; padding-bottom: 20px; margin-bottom: 28px; }
    h1 { font-size: 30px; letter-spacing: -0.02em; margin: 0 0 4px; }
    .muted { color: #5a6474; font-size: 13px; }
    .meta { text-align: right; font-size: 13px; color: #5a6474; }
    .meta b { color: #16181d; }
    .pill { display:inline-block; padding: 3px 11px; border-radius: 999px; font-size: 11px; font-weight: 700; letter-spacing: .04em;
            border: 1px solid #d3d8e0; color: #5a6474; }
    .pill.paid { background: #f0fdf4; color: #15803d; border-color: #bbf7d0; }
    .parties { display: flex; gap: 48px; margin-bottom: 28px; }
    .parties h3 { font-size: 11px; text-transform: uppercase; letter-spacing: .12em; color: #8b94a4; margin: 0 0 6px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px; }
    th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color: #8b94a4; border-bottom: 1px solid #e7e9ee; padding: 8px 10px; }
    td { padding: 11px 10px; border-bottom: 1px solid #f0f2f5; }
    .num { text-align: right; }
    .totals { width: 280px; margin-left: auto; font-size: 14px; }
    .totals .row { display: flex; justify-content: space-between; padding: 7px 10px; }
    .totals .grand { border-top: 2px solid #16181d; font-weight: 700; font-size: 16px; }
    .notes { margin-top: 32px; font-size: 13px; color: #5a6474; white-space: pre-wrap; border-top: 1px solid #e7e9ee; padding-top: 16px; }
    @media print { body { padding: 0; } }
  </style></head><body>
    <div class="head">
      <div>
        <h1>Invoice</h1>
        <div class="muted">${esc(inv.invoice_number || "")}</div>
      </div>
      <div class="meta">
        <div><b>Issued</b> ${esc(fmtDate(inv.issued_date))}</div>
        <div><b>Due</b> ${esc(fmtDate(inv.due_date))}</div>
        <div style="margin-top:8px"><span class="pill ${inv.status === "paid" ? "paid" : ""}">${esc(statusLabel)}</span></div>
      </div>
    </div>
    <div class="parties">
      <div><h3>From</h3><div>${esc(fromEmail || "")}</div></div>
      <div><h3>Bill to</h3><div><b>${esc(inv.client_name || "")}</b></div><div class="muted">${esc(inv.client_email || "")}</div></div>
    </div>
    <table>
      <thead><tr><th>Description</th><th class="num">Qty</th><th class="num">Unit</th><th class="num">Amount</th></tr></thead>
      <tbody>${rows || `<tr><td colspan="4" class="muted">No line items</td></tr>`}</tbody>
    </table>
    <div class="totals">
      <div class="row"><span class="muted">Subtotal</span><span>${money(inv.subtotal, cur)}</span></div>
      <div class="row grand"><span>Total</span><span>${money(inv.total, cur)}</span></div>
    </div>
    ${inv.notes ? `<div class="notes">${esc(inv.notes)}</div>` : ""}
  </body></html>`;

  const w = window.open("", "_blank");
  if (!w) return false;
  w.document.open();
  w.document.write(doc);
  w.document.close();
  // Give the new document a tick to lay out before invoking print.
  w.onload = () => { try { w.focus(); w.print(); } catch {} };
  setTimeout(() => { try { w.focus(); w.print(); } catch {} }, 400);
  return true;
}

/* ── Editor ──────────────────────────────────────────────────────────────── */
function InvoiceEditor({ initial, projects, onCancel, onSave }) {
  const [v, setV] = useState(() => ({
    client_name: initial?.client_name || "",
    client_email: initial?.client_email || "",
    currency: initial?.currency || "USD",
    status: initial?.status || "draft",
    project_id: initial?.project_id || "",
    issued_date: initial?.issued_date || new Date().toISOString().slice(0, 10),
    due_date: initial?.due_date || "",
    notes: initial?.notes || "",
    line_items: (Array.isArray(initial?.line_items) && initial.line_items.length ? initial.line_items : [emptyItem()])
      .map(it => ({ description: it.description || "", quantity: Number(it.quantity) || 0, unit_price: Number(it.unit_price) || 0 })),
  }));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const set = (k, val) => setV(s => ({ ...s, [k]: val }));
  const setItem = (i, k, val) => setV(s => ({ ...s, line_items: s.line_items.map((it, idx) => idx === i ? { ...it, [k]: val } : it) }));
  const addItem = () => setV(s => ({ ...s, line_items: [...s.line_items, emptyItem()] }));
  const removeItem = (i) => setV(s => ({ ...s, line_items: s.line_items.filter((_, idx) => idx !== i) }));

  const subtotal = useMemo(
    () => v.line_items.reduce((sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unit_price) || 0), 0),
    [v.line_items]
  );

  const inputStyle = {
    width: "100%", padding: "9px 11px", fontFamily: t.font.sans, fontSize: 14, color: t.color.ink,
    background: t.color.bg, border: `1px solid ${t.color.borderStrong}`, borderRadius: t.radius.md, outline: "none",
  };

  const save = async () => {
    if (!v.client_name.trim()) { setErr("Client name is required."); return; }
    setSaving(true); setErr("");
    const items = v.line_items
      .filter(it => it.description.trim() || Number(it.quantity) || Number(it.unit_price))
      .map(it => ({ description: it.description.trim(), quantity: Number(it.quantity) || 0, unit_price: Number(it.unit_price) || 0 }));
    const total = items.reduce((s, it) => s + it.quantity * it.unit_price, 0);
    const fields = {
      client_name: v.client_name.trim(),
      client_email: v.client_email.trim() || null,
      currency: v.currency,
      status: v.status,
      project_id: v.project_id || null,
      issued_date: v.issued_date || null,
      due_date: v.due_date || null,
      notes: v.notes.trim() || null,
      line_items: items,
      subtotal: Number(total.toFixed(2)),
      total: Number(total.toFixed(2)),
    };
    const saved = initial?.id ? await sb.updateInvoice(initial.id, fields) : await sb.createInvoice(fields);
    setSaving(false);
    if (saved) onSave(saved);
    else setErr("Couldn't save the invoice. Please try again.");
  };

  return (
    <Card style={{ padding: 24 }}>
      <Heading level="h3" style={{ marginBottom: 18 }}>{initial?.id ? `Edit ${initial.invoice_number || "invoice"}` : "New invoice"}</Heading>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        <Field label="Client name"><Input value={v.client_name} onChange={e => set("client_name", e.target.value)} placeholder="Acme Plumbing LLC" /></Field>
        <Field label="Client email"><Input type="email" value={v.client_email} onChange={e => set("client_email", e.target.value)} placeholder="owner@acme.com" /></Field>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 20 }}>
        <Field label="Issued"><input type="date" value={v.issued_date} onChange={e => set("issued_date", e.target.value)} style={inputStyle} /></Field>
        <Field label="Due"><input type="date" value={v.due_date} onChange={e => set("due_date", e.target.value)} style={inputStyle} /></Field>
        <Field label="Currency">
          <select value={v.currency} onChange={e => set("currency", e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
            {Object.keys(CURRENCIES).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
      </div>

      {/* Line items */}
      <div style={{ ...t.type.eyebrow, color: t.color.faint, marginBottom: 10 }}>Line items</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 120px 110px 32px", gap: 8, fontSize: 11, color: t.color.faint, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em" }}>
          <span>Description</span><span>Qty</span><span>Unit price</span><span style={{ textAlign: "right" }}>Amount</span><span />
        </div>
        {v.line_items.map((it, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 80px 120px 110px 32px", gap: 8, alignItems: "center" }}>
            <input value={it.description} onChange={e => setItem(i, "description", e.target.value)} placeholder="Website rebuild" style={inputStyle} />
            <input type="number" min="0" value={it.quantity} onChange={e => setItem(i, "quantity", e.target.value)} style={inputStyle} />
            <input type="number" min="0" step="0.01" value={it.unit_price} onChange={e => setItem(i, "unit_price", e.target.value)} style={inputStyle} />
            <span style={{ textAlign: "right", fontSize: 14, color: t.color.ink, fontWeight: 600 }}>{money((Number(it.quantity) || 0) * (Number(it.unit_price) || 0), v.currency)}</span>
            <button onClick={() => removeItem(i)} title="Remove" style={{ border: "none", background: "transparent", color: t.color.faint, cursor: "pointer", fontSize: 18, lineHeight: 1 }}>×</button>
          </div>
        ))}
      </div>
      <Button variant="ghost" size="sm" onClick={addItem} style={{ marginBottom: 18 }}>+ Add line item</Button>

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
        <div style={{ width: 240 }}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderTop: `2px solid ${t.color.ink}`, fontWeight: 700, fontSize: 16, color: t.color.ink }}>
            <span>Total</span><span>{money(subtotal, v.currency)}</span>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        <Field label="Status">
          <select value={v.status} onChange={e => set("status", e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
            <option value="draft">Draft</option><option value="sent">Sent</option><option value="paid">Paid</option>
          </select>
        </Field>
        <Field label="Linked project" hint="optional">
          <select value={v.project_id} onChange={e => set("project_id", e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
            <option value="">— none —</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.business_name || "Untitled site"}</option>)}
          </select>
        </Field>
      </div>

      <Field label="Notes / payment terms" hint="optional" style={{ marginBottom: 18 }}>
        <textarea value={v.notes} onChange={e => set("notes", e.target.value)} rows={3} placeholder="Payment due within 14 days. Bank transfer to…"
          style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }} />
      </Field>

      {err && <Text small style={{ color: t.color.danger, marginBottom: 12 }}>{err}</Text>}
      <div style={{ display: "flex", gap: 10 }}>
        <Button variant="accent" onClick={save} disabled={saving}>{saving ? "Saving…" : initial?.id ? "Save changes" : "Create invoice"}</Button>
        <Button variant="secondary" onClick={onCancel} disabled={saving}>Cancel</Button>
      </div>
      <Text small muted style={{ marginTop: 14 }}>
        This is a simple invoice generator — it doesn't calculate tax or handle VAT compliance.
      </Text>
    </Card>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */
export default function InvoicesPage({ onHome, onBuild, onProjects, user, credits, onSignOut }) {
  const [invoices, setInvoices] = useState(null); // null = loading
  const [projects, setProjects] = useState([]);
  const [editing, setEditing] = useState(null);    // invoice object, {} for new, or null
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    let alive = true;
    sb.listInvoices().then(list => { if (alive) setInvoices(list); });
    sb.listProjects().then(list => { if (alive) setProjects(list); });
    return () => { alive = false; };
  }, []);

  const fromEmail = user?.email || sb._user?.email || "";

  const togglePaid = async (inv) => {
    setBusyId(inv.id);
    const next = inv.status === "paid" ? "sent" : "paid";
    const saved = await sb.updateInvoice(inv.id, { status: next });
    if (saved) setInvoices(list => list.map(x => x.id === inv.id ? saved : x));
    setBusyId(null);
  };

  const remove = async (inv) => {
    setBusyId(inv.id);
    const ok = await sb.deleteInvoice(inv.id);
    if (ok) setInvoices(list => list.filter(x => x.id !== inv.id));
    setBusyId(null);
  };

  const onSaved = (saved) => {
    setInvoices(list => {
      const exists = list.some(x => x.id === saved.id);
      return exists ? list.map(x => x.id === saved.id ? saved : x) : [saved, ...list];
    });
    setEditing(null);
  };

  return (
    <div style={{ background: t.color.bg, color: t.color.text, fontFamily: t.font.sans, minHeight: "100vh" }}>
      <div style={{ borderBottom: `1px solid ${t.color.border}` }}>
        <MarketingNav onHome={onHome} onBuild={onBuild} onSignOut={onSignOut} user={user} credits={credits}
          links={[{ label: "Home", onClick: onHome }, { label: "Projects", onClick: onProjects }]} />
      </div>

      <Container style={{ padding: "clamp(40px,6vw,72px) 24px 64px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16, marginBottom: 32 }}>
          <div>
            <Eyebrow>Agency toolkit</Eyebrow>
            <Heading level="h1">Invoices</Heading>
          </div>
          {!editing && <Button variant="accent" onClick={() => setEditing({})}>New invoice</Button>}
        </div>

        {editing ? (
          <InvoiceEditor
            initial={editing.id ? editing : null}
            projects={projects}
            onCancel={() => setEditing(null)}
            onSave={onSaved}
          />
        ) : invoices === null ? (
          <Text muted>Loading…</Text>
        ) : invoices.length === 0 ? (
          <Card style={{ padding: 40, textAlign: "center" }}>
            <Heading level="h3" style={{ marginBottom: 8 }}>No invoices yet</Heading>
            <Text muted style={{ marginBottom: 20 }}>Create an invoice for a client, export it as a PDF, and track whether it's been paid.</Text>
            <Button variant="accent" onClick={() => setEditing({})}>Create your first invoice</Button>
          </Card>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {invoices.map(inv => (
              <Card key={inv.id} style={{ padding: 18, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                <div style={{ minWidth: 220 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: t.color.ink }}>{inv.client_name || "—"}</span>
                    <Badge tone={STATUS_TONE[inv.status] || "neutral"}>{inv.status === "paid" ? "Paid" : inv.status === "sent" ? "Sent" : "Draft"}</Badge>
                  </div>
                  <Text small muted style={{ marginTop: 3 }}>
                    {inv.invoice_number || "—"} · {money(inv.total, inv.currency)} · due {fmtDate(inv.due_date)}
                  </Text>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Button variant="secondary" size="sm" onClick={() => printInvoice(inv, fromEmail)}>Export PDF</Button>
                  <Button variant="secondary" size="sm" onClick={() => togglePaid(inv)} disabled={busyId === inv.id}>
                    {inv.status === "paid" ? "Mark unpaid" : "Mark paid"}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setEditing(inv)}>Edit</Button>
                  <Button variant="ghost" size="sm" onClick={() => remove(inv)} disabled={busyId === inv.id} style={{ color: t.color.danger }}>Delete</Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Container>
    </div>
  );
}
