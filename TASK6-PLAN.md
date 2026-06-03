# Task 6 — Live AI Chat-Editing on the Result Screen (Architecture Plan)

**Status:** Planning only. No feature code written yet (blocked on API credit top-up for testing).
**Author:** Claude + Stefan. Last updated: 2026-06-03.

> Goal: After a page is generated, let the user type natural-language edit
> requests ("make the hero green", "add a pricing section", "change the phone
> number to 555-1234") and have the AI return revised HTML that re-renders
> live in the existing preview — without re-running the full generation flow
> and without charging a full credit per tweak.

---

## 0. How the current flow works (verified by reading the code)

Trace of the existing generate → preview pipeline, so the edit feature can
slot in without disturbing it:

| Concern | Where | Notes |
|---|---|---|
| Screen routing | `src/store.js` `screen` + `setScreen` | zustand, persisted. Screens: `home`, `builder`, `generating`, `result`, `pricing_wall`, … |
| Generated HTML state | `src/store.js:116-117` `generatedHtml` / `setGeneratedHtml` | Single string in the store, persisted via `partialize` (form, generatedHtml, screen). |
| Generation request | `src/App.jsx` `GeneratingScreen` (~1207) | On mount: fetch Pexels images → POST `/api/generate` with `{ model:"claude-sonnet-4-6", max_tokens:24000, messages:[{role:"user", content: buildPrompt(form, images)}] }`. |
| API proxy | `api/generate.js` | **Thin pass-through.** Spreads `req.body`, adds `stream:true`, forwards to Anthropic `/v1/messages`, pipes the SSE stream straight back. Knows nothing about generation vs. editing → **reusable as-is**. |
| Stream handling | `src/App.jsx` (~1272-1290) | Reads SSE, accumulates `content_block_delta.text` into `fullText`; captures `message_delta.stop_reason` (truncation guard added in commit `d4f943f`). |
| Post-processing | `src/App.jsx` (~1292-1303) | Trims to `<!DOCTYPE/html>` … `</html>`, replaces `__LOGO__`, validates `<!doctype` present, then `onDone(html)`. |
| Credit deduction | `src/App.jsx` (~2641-2645) `onDone` | `await sb.deductCredit()` → `refreshCredits()` → `setGeneratedHtml(html)` → `setScreen("result")`. **Credit charged exactly once, only on successful generation.** `onError` charges nothing. |
| Result layout | `src/App.jsx` (~2623-2649) | Two panes: left `<ResultScreen html=…>` (open/publish/download/copy/reset actions), right `<PreviewFrame html=…>`. |
| Preview render | `src/App.jsx` `PreviewFrame` (410-459) | Writes `html` to `iframe.srcdoc` **only when the html value changes** (`writtenHtml.current === html` guard). Sandbox `allow-scripts allow-same-origin`. |

**Two load-bearing facts the whole plan leans on:**

1. **The preview is already reactive.** Change `generatedHtml` in the store →
   `PreviewFrame`'s `html` prop changes → it rewrites `srcdoc` once → live
   update. An edit doesn't need to touch `PreviewFrame` at all.
2. **`/api/generate` is generation-agnostic.** It forwards whatever `messages`
   it's given. Editing reuses it with an edit-shaped payload → **no backend
   changes required for v1.**

---

## 1. UI — where the chat box goes and what it looks like

**Placement:** Inside the left panel (`ResultScreen`, `src/App.jsx:1355`), below
the existing action buttons (Open / Publish / Download / Copy) and above the
"Start Over" reset. The right pane (`PreviewFrame`) is untouched — it just keeps
reflecting the latest HTML.

**Component:** new `EditChat` component, rendered inside `ResultScreen`.

```
┌─ ResultScreen (left panel) ────────────┐   ┌─ PreviewFrame (right) ─┐
│ ✓ Your page is ready                   │   │                        │
│ [🔗 Open] [🚀 Publish]                 │   │   live iframe of the   │
│ [↓ Download] [{} Copy]                 │   │   CURRENT generatedHtml │
│ ───────────────────────────────────── │   │   (auto-updates on edit)│
│ ✦ Edit with AI                         │   │                        │
│ ┌─────────────────────────────────┐   │   │                        │
│ │ chat transcript (user/AI turns) │   │   │                        │
│ │  • "make the hero darker" ✓     │   │   │                        │
│ │  • "add an FAQ section"  ✓      │   │   │                        │
│ └─────────────────────────────────┘   │   │                        │
│ [ Describe a change…        ] [Send →] │   │                        │
│ 3 free edits left · ⏎ to send          │   │                        │
│ ─────────────────────────────────────  │   │                        │
│ ↩ Undo last edit   ⟲ Start Over        │   │                        │
└────────────────────────────────────────┘   └────────────────────────┘
```

**Visual style:** match existing tokens — orange accent `#f97316`, rounded
`borderRadius:9-12`, `fontFamily:"inherit"`, `#e5e7eb` borders, the same button
patterns already in `ResultScreen`. A small `✦ Edit with AI` eyebrow (reuse the
spark glyph from the generate button). Input is a single-line textarea that
grows to ~3 lines; Enter sends, Shift+Enter newlines. While an edit is
in-flight: input disabled, Send shows the same spinner pattern as Publish
(`animation:"spin .7s"`), and a subtle "Applying your change…" line.

**Transcript:** lightweight list of past instructions with a ✓/✗ status each, so
the user can see what they asked for. This is UI-only state; it does not need to
persist across sessions for v1 (but the resulting HTML does, via the store).

---

## 2. How an edit request works

**Shape:** full-document rewrite (v1). The model receives the current HTML and
the instruction, and returns the **complete revised HTML document**. This reuses
the existing trim/validate/`setGeneratedHtml` pipeline verbatim — the response is
processed exactly like a generation response.

> Rejected for v1: diff/patch-based edits (model returns only changed regions).
> Cheaper on output tokens but fragile (anchoring, partial application, broken
> markup). Note it in §"Future optimizations" — revisit once v1 is stable.

**Request:** POST to the **existing** `/api/generate` with an edit payload:

```js
{
  model: "claude-sonnet-4-6",        // same model; see cost note below
  max_tokens: 24000,                  // same ceiling as generation
  system: EDIT_SYSTEM_PROMPT,         // "You are editing an existing HTML
                                      //  landing page. Apply ONLY the requested
                                      //  change. Return the COMPLETE, valid HTML
                                      //  document and nothing else. Preserve all
                                      //  unrelated markup, scripts, styles, and
                                      //  the __LOGO__ placeholder."
  messages: [
    { role: "user",      content: `Current page HTML:\n\n${currentHtml}` },
    { role: "assistant", content: "Understood. What change would you like?" },
    { role: "user",      content: userInstruction }
  ]
}
```

- Build a `buildEditPrompt(currentHtml, instruction)` helper next to
  `buildPrompt` (`src/App.jsx:122`).
- **Reuse the streaming reader.** Factor the SSE-reading loop currently inline in
  `GeneratingScreen` (~1272-1303) into a shared `streamAnthropic(body, {onProgress})`
  helper that returns the final text (and surfaces `stop_reason`). Both generate
  and edit call it. This is the one meaningful refactor and it removes
  duplication rather than adding risk.
- On success: run the **same** post-processing (trim to doctype…`</html>`,
  re-apply `__LOGO__`, validate `<!doctype`) → `setGeneratedHtml(newHtml)`. Done.
  The preview updates itself.

**Logo note:** generation replaces `__LOGO__` before storing, so the stored HTML
already has the real logo baked in. The edit system prompt must be told to
preserve whatever logo markup exists (do NOT reintroduce `__LOGO__`); simplest is
to not re-run the `__LOGO__` replace on edits, or make it a no-op when the
placeholder is absent (it already is — `.replace` on absent string is harmless).

---

## 3. Credit handling — edits are free, but bounded

**Decision: edits do NOT consume a credit.** A credit buys a page *and its
refinement*. This is a deliberate UX/retention choice.

**But** each edit costs real API output tokens (a full-document rewrite ≈ the
output of a generation, ~5-15k tokens). So "free to the user" must be "bounded
for the business." Guardrails:

1. **Per-page edit cap.** Track `editCount` for the current generated page in the
   store; allow N free edits (start N = 5, tune later). When exhausted, show
   "You've used your free edits for this page — regenerate or buy credits."
   - Add `editCount` + `incrementEditCount` + reset-on-new-generation to the store.
   - Reset `editCount` to 0 inside `onDone` (whenever a fresh page is generated).
2. **Gate on provenance.** Only allow editing a page that was generated this
   session (i.e. `generatedHtml` exists and a credit was spent to make it). Since
   you can only reach the result screen via a successful `onDone` (which deducted
   a credit), this is naturally satisfied — no extra check needed for v1.
3. **One in-flight edit at a time.** Disable input while editing; ignore submits
   during a pending request. Prevents accidental double-spend of API cost.

**Credit-schema note:** the credit system is integer-based (`deduct_credit` RPC,
integer `balance`). Fractional "0.1 credit per edit" is **not** supported without
a DB change. So v1 = free + capped. If you later want metered editing, that's a
backend task (new RPC / fractional balance), out of scope here.

**Cost framing (for your own awareness, not user-facing):** raising max_tokens
earlier was free because it's a ceiling. Edits are different — each one is a real
generation-sized output charge. The per-page cap is the cost lever. With N=5 and
Sonnet output ~$15/M tokens, worst case ≈ 5 × ~12k tokens ≈ $0.90 of output per
page on top of the generation. Consider Haiku for edits (see §Future) to cut this.

---

## 4. Error handling

Reuse the patterns already in place; the guiding rule is **an edit must never
destroy the working page.**

- **Preserve-on-failure (most important).** Keep the pre-edit HTML in a local var
  (and/or an undo stack). Only call `setGeneratedHtml(newHtml)` after the response
  passes validation. If anything fails, the existing `generatedHtml` is untouched
  → preview still shows the last good page.
- **Truncation guard.** Reuse the `stop_reason === "max_tokens"` check from
  `d4f943f`. On truncation: toast "That change made the page too long to finish —
  try a smaller edit," do **not** apply, do **not** count it against the edit cap.
- **Invalid HTML.** Reuse the `<!doctype` validation. If the model returns prose
  or a fragment instead of a full doc, reject and toast "Couldn't apply that edit
  — please rephrase." Keep previous HTML.
- **Network / non-200.** Reuse the `r.status` + parsed-detail error path from
  `GeneratingScreen` (~1262-1271). Toast a clear message; keep previous HTML.
- **Empty / no-op response.** If the returned HTML is identical or empty, surface
  "No change detected" and don't burn an edit-cap slot.
- **Surface via toast** (`toast(msg, "error")`, the global toaster at
  `src/App.jsx:285-292`) — consistent with the rest of the app. The chat
  transcript marks that turn ✗.
- **Undo.** Maintain a small history stack of prior HTML versions; "↩ Undo last
  edit" pops it and `setGeneratedHtml(previous)`. Cheap insurance, no API cost.

---

## 5. Doing this WITHOUT breaking the existing flow

Risk-isolation principles, in priority order:

1. **No backend changes.** `/api/generate` is reused untouched. Zero risk to the
   generation endpoint or to `/api/images` / `/api/publish`.
2. **`PreviewFrame` untouched.** It already reacts to `html` changes. Do not
   modify it. (Confirm: its `writtenHtml` guard means an edit that produces new
   HTML triggers exactly one `srcdoc` rewrite — the intended behavior.)
3. **`GeneratingScreen` essentially untouched.** The only change is extracting the
   SSE reader into a shared `streamAnthropic` helper that `GeneratingScreen` then
   calls — behavior-preserving refactor. Generation keeps deducting one credit in
   `onDone`; editing never calls `deductCredit`. The two code paths stay separate.
4. **Additive store changes only.** Add `editCount`/history; do not alter
   `generatedHtml`, `setGeneratedHtml`, `screen`, or `partialize` semantics.
   Editing uses the *existing* `setGeneratedHtml` — the same setter generation
   uses — so persistence and the preview keep working for free.
5. **New component, not a rewrite.** `EditChat` is a new component dropped into
   `ResultScreen`'s JSX. `ResultScreen`'s existing actions are unchanged. If
   `EditChat` is removed, the result screen is exactly as it is today.
6. **Feature-flag the entry point** (optional but cheap): render `EditChat` behind
   a simple boolean so it can be hidden instantly if something misbehaves in prod.

**Regression checklist (run before shipping):**
- Generate a page end-to-end → still deducts exactly one credit, preview renders.
- Publish / Download / Copy / Open still work on an edited page.
- Refresh mid-session → persisted `generatedHtml` (edited version) restores.
- An edit failure leaves the previous page intact in the preview.
- Truncated edit shows toast, applies nothing, costs no edit slot.

---

## 6. Step-by-step build order (for when credits are topped up)

Each step is independently testable; stop and verify before the next.

1. **Refactor (no behavior change): extract `streamAnthropic(body, {onProgress})`.**
   Pull the SSE-reading loop out of `GeneratingScreen` into a shared helper that
   returns `{ text, stopReason }`. Wire `GeneratingScreen` to use it. Verify
   generation still works identically. *(This is the only change that touches the
   existing path — do it first, in isolation, and confirm no regression.)*

2. **Add `buildEditPrompt(currentHtml, instruction)` + `EDIT_SYSTEM_PROMPT`.**
   Pure function next to `buildPrompt`. Unit-eyeball the produced payload.

3. **Store: additive edit state.** Add `editCount`, `incrementEditCount`,
   `resetEditCount`, and an `htmlHistory` stack (for undo) to `src/store.js`.
   Reset `editCount`/history when a new page is generated (in `onDone`).

4. **`EditChat` component (UI shell, no API yet).** Build the chat box,
   transcript, input, send button, "N free edits left", undo button — all wired
   to local/store state with a stubbed `applyEdit` that just logs. Render it in
   `ResultScreen` below the action buttons. Verify layout/styles in isolation.

5. **Wire `applyEdit` to the API.** Call `streamAnthropic` with the edit payload,
   run the shared post-processing, then `setGeneratedHtml(newHtml)` on success.
   Confirm the preview live-updates. This is the first step that spends API
   tokens — test with credits available.

6. **Error handling + guards.** Add preserve-on-failure, truncation guard,
   invalid-HTML/empty/no-op handling, in-flight lock, edit-cap enforcement, undo.

7. **Polish + regression pass.** Run the §5 regression checklist. Tune N (free
   edit cap). Consider the feature flag default.

8. **(Optional, later) Cost optimization.** Evaluate Haiku for edits and/or
   diff-based editing. See below.

---

## Future optimizations (explicitly out of scope for v1)

- **Cheaper model for edits** (e.g. Haiku 4.5): edits are simpler than cold
  generation; a smaller model may suffice and cut per-edit output cost
  substantially. A/B the quality before switching.
- **Diff/patch editing:** model returns only changed regions → far fewer output
  tokens. Needs robust anchoring + safe application; revisit once full-rewrite v1
  is proven.
- **Streaming the edit into the preview** (progressive `srcdoc` updates) for a
  "watch it change" effect. Nice-to-have; full-replace-on-complete is fine for v1.
- **Metered editing** (fractional credits) if free+capped proves too costly —
  requires a backend credit-schema change.
- **Persist the edit transcript** across sessions (currently UI-only).
```
