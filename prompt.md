# prompt.md — how AI fit into this

The honest answer here is unusual, so I want to be upfront about it rather
than write something that reads like a normal "I used Copilot for
autocomplete" account: **this project was built by Claude (Anthropic's AI
assistant), in an agentic coding session, from a single prompt.** I'm
writing this file as that same assistant, describing what actually
happened rather than dressing it up.

## The prompt

The entire brief — the assignment text you're reading right now, pasted
verbatim — was the only instruction given. There was no back-and-forth
requirements conversation, no wireframe, no starter code. One follow-up
message ("Continue") was sent partway through, after a prior response ran
up against a tool-call limit mid-build and reported honest progress rather
than presenting an unfinished project as done.

## Workflow — what "AI-augmented" meant here concretely

This wasn't autocomplete-in-an-editor. The session had:
- A sandboxed Linux environment with a real filesystem and shell (bash,
  npm, node).
- File read/write/edit tools.
- No internet access beyond package registries (npm) and a few source-code
  domains — no ability to browse Stack Overflow or docs sites mid-build,
  so implementation choices came from training knowledge, not live lookup.
- No headless browser available in the sandbox, which matters — see
  "Where this fell short," below.

Within that, the actual sequence was:

1. **Skill/instruction check.** Before writing any code, the environment's
   own `frontend-design` skill file was read for visual-design guidance
   (palette/type/layout discipline, avoiding templated AI-design defaults).
   No other skills, MCP servers, or external integrations were invoked —
   just the standard toolset (bash, file edit, no web search was needed
   since none of the libraries needed docs lookup beyond what's in
   training data).
2. **Architecture decided up front, not iteratively discovered:** domain
   (product catalog, 60-field schema), state layer (Zustand), table engine
   (TanStack Table — started on the newly-released v9, found its core API
   had changed shape in a way that felt risky to build against blind with
   no docs access, and deliberately downgraded to the stable v8 API
   instead), virtualization (`@tanstack/react-virtual`), and the
   worker-based search architecture, all decided before the first
   component was written.
3. **Built file-by-file**, schema → data generator → store → worker →
   table → toolbar → forms → CSV import, checking `tsc` and `oxlint` after
   the major pieces landed rather than only at the very end.
4. **Self-testing without a browser.** No headless browser was available
   in the sandbox, so instead of skipping verification, a Node-side
   sanity-check script (`scripts/sanity-check.ts`) was written to exercise
   the pure logic directly: schema integrity, generation at 100k rows
   (with timing), id-uniqueness, the filter substring-scan performance,
   CSV header-matching, and value coercion.
5. **That script caught a real bug.** The first implementation derived new
   record ids from `records.length`. Reasoning through the delete-then-add
   sequence by hand (rather than the script) actually surfaced it: delete
   a middle record, `length` drops by one, and the "next" id can collide
   with an id still in use elsewhere in the array. Fixed by moving id
   generation into the store behind a monotonic counter that only
   increments, never derived from array length. This is called out in the
   README too, since it's the kind of bug that's easy to ship if you only
   test the happy path (add records, never delete-then-add).
6. **Iterated on a UX gap found via the same reasoning pass**, not a live
   click-test: regenerating 100k rows takes ~1.7s synchronously (measured
   via the sanity script) — long enough to look frozen with no feedback.
   Added a deferred loading overlay so the UI shows "Generating…" before
   the main-thread work runs, rather than leaving it silent.

## Where AI fit, honestly

- **Scaffolding:** all of it. Every file in `src/` was written by Claude.
- **Debugging:** yes, in the sense described above — reasoning through
  edge cases (delete-then-add id collision) and writing a script to
  verify assumptions (100k-row generation and filter timing) rather than
  trusting them.
- **Pair-writing logic:** there was no pairing partner in this session —
  no human wrote or reviewed code before it landed. That's the main way
  this differs from a typical "prompt.md" for an assignment like this,
  and it's the thing most worth flagging plainly rather than glossing
  over.

## Where this fell short

- **No real browser testing happened.** `tsc`, `oxlint`, `vite build`, and
  the Node sanity script all pass, and the logic was traced by hand for
  known-tricky spots (sticky-column offsets, the worker request/response
  race on rapid typing, PapaParse's worker-mode bundling behavior under
  Vite). But nobody — human or AI — actually clicked through this app in
  a browser before it shipped. If you hit a rendering bug on first run,
  this is why: it's the honest gap in an otherwise fairly rigorous
  process.
- **No design iteration loop.** The `frontend-design` skill's guidance
  (take one real aesthetic risk, avoid templated defaults) was read but
  applied in a fairly restrained, utilitarian way appropriate for a dense
  data tool — indigo accent, slate neutrals, system font stack — rather
  than pushed hard on. A data-density-focused table wasn't the place to
  spend that risk; the aesthetic decision was to *not* decorate it.
