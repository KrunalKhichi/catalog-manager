# Catalog Manager — Data Table Assignment

A product-catalog data table for browsing 10k–100k records with up to 60
configurable columns. React + TypeScript, built with Vite.

**Domain:** product/inventory catalog (SKU, pricing, stock, warehouse,
supplier, logistics, merchandising fields — 60 in total).

## Running it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build       # production build to dist/
npm run preview     # serve the production build
npm run lint         # oxlint
npm run sanity-check # node-side checks for data gen / filtering / CSV mapping (see scripts/)
```

No backend — everything (data generation, storage, search, CSV parsing)
runs in the browser. Refreshing the page resets the dataset back to its
generated seed state; there's no persistence layer, by design (see
"what I'd build next").

## What's implemented

- **Search / filter** — a global text search box (matches SKU, name, brand,
  category, supplier, tags, etc.) plus a filter popover for category,
  status, and price/stock ranges. All of it runs in a **Web Worker**
  (`src/workers/searchWorker.ts`), debounced 120ms, so typing never blocks
  the main thread even at 100k rows.
- **Add a record** — a modal form generated from the field schema: ~12 core
  fields up front, the remaining ~48 tucked under "Show advanced fields."
  Required-field and numeric validation before submit.
- **Bulk upload via CSV** — drag-and-drop or file picker, parsed with
  PapaParse. Headers are matched to schema fields by name (key or label,
  case/punctuation-insensitive), so column order in the file doesn't
  matter and re-exported files from this same app round-trip cleanly. You
  get a preview (matched vs. skipped columns, row count) before anything
  is committed, plus a "download sample CSV" link.
- **Delete** — a single-record delete lives in the row-detail panel; bulk
  delete is checkbox selection → "Delete N selected" in the toolbar, both
  going through the same confirm dialog.
- **Wide-table handling (10–60 columns)** — a "Columns" panel with
  presets (Compact 10 / Standard 20 / Wide 40 / All 60) plus per-field
  checkboxes and a search box. Data always carries all 60 fields; only
  *display* is restricted, so toggling columns is instant. The select
  checkbox column and the first data column stay pinned while the rest of
  the (potentially 9000px-wide) table scrolls horizontally, so you don't
  lose your place. Clicking a row opens a detail panel showing every field
  regardless of which columns are currently visible — the table is the
  scan view, the panel is the "give me everything" view.
- **Row virtualization** — `@tanstack/react-virtual` renders only the
  visible slice of rows (viewport + overscan) via a windowed `<tbody>`;
  10k or 100k rows cost roughly the same to render.

## The decision I'm least sure about

Running filtering in a **Web Worker** with a synced copy of the dataset,
rather than just filtering in the main thread with `useMemo`.

At 100k rows, a plain substring scan across a handful of fields turns out
to be fast — under 15ms in my own timing (see `npm run sanity-check`).
That's well inside "invisible to the user" territory even without a
worker. So the worker is arguably solving a problem that, at this scale,
doesn't really bite yet — and it costs real complexity: a second copy of
the dataset that has to be kept in sync on every add/delete/import, a
debounce + request-id scheme to avoid stale results overwriting fresh
ones, and one more moving part that can silently break in a way that's
hard to unit test outside a browser.

The alternative I rejected was: keep filtering on the main thread, memoize
against `[records, searchQuery, filters]`, and lean on debouncing alone
for responsiveness. That's less code, easier to reason about, and would
have been completely fine for the stated 10k–100k range.

I kept the worker because the assignment explicitly frames this as a
scale problem ("data-intensive design" is a named evaluation axis, and
the README asks what breaks at 10x). A worker is the version of this
that doesn't need to be revisited if the dataset grows or the filter
logic gets heavier (fuzzy matching, multi-field scoring, etc.) — but I
want to be honest that for the dataset sizes actually in front of a user
today, this is defensible engineering-for-headroom more than a fix for
an observed problem, and a reviewer could reasonably prefer the simpler
version.

## What breaks first at 10x (i.e. ~1M rows)

Roughly in this order:

1. **Client memory.** 1M rows × 60 fields as JS objects, held twice (main
   thread + worker copy) is a genuinely large heap footprint — likely
   several hundred MB. This is the first real ceiling, not CPU.
2. **The full-replace worker sync.** Every add/delete/CSV import currently
   re-sends the *entire* records array to the worker (`postMessage({type:
   'sync', records})`). Structured-cloning 1M objects on every mutation
   gets expensive and janky. I'd switch to incremental sync (send only
   the delta — added/removed ids — and patch the worker's copy in place)
   instead of a full resend.
3. **Sorting.** `getSortedRowModel()` re-sorts the *entire* filtered set
   on every sort-column click. At 100k that's imperceptible; at 1M,
   `Array.prototype.sort` with a real comparator starts to show up as a
   visible stall. I'd move sorting into the worker alongside filtering
   (same dataset copy, same reasoning), or paginate/virtualize the sort
   itself so we only ever fully order what's visible plus a buffer.
4. **CSV import.** Parsing is already off the main thread (PapaParse
   `worker: true`), but `bulkAddRecords` still does one big array-spread
   `[...newRecords, ...state.records]` and a full worker re-sync
   afterward — same delta-sync fix as #2 would apply here too.
5. **Eventually, "hold it all in the browser" itself.** Past a few
   million rows this stops being a client-side data-modeling problem and
   becomes a pagination/virtual-scroll-against-a-server problem — real
   backend with cursor-based pagination and server-side filtering,
   fetching windows of rows as the user scrolls instead of holding the
   full set in memory. That's a genuine architecture change, not a
   tuning pass, which is why it's last on this list rather than first.

## What I'd build next with more time

- **Column reordering & resizing** (drag-and-drop headers, persisted).
  Visibility is covered; reordering isn't, and on a 60-column table
  that's a real gap.
- **Undo for delete.** Right now delete goes through a confirm dialog and
  that's it. A "Deleted 12 records · Undo" toast (keep the removed rows
  in memory for ~5s before they're really gone) would remove the need for
  the confirm dialog *and* be safer.
- **Edit-in-place.** You can add and delete, but not edit an existing
  record without deleting and re-adding it. A double-click-to-edit cell,
  or an "Edit" action on the detail panel, is the obvious next feature.
- **Persistence.** Everything currently lives in memory and resets on
  reload. IndexedDB (still fully client-side, no backend needed) would
  make the dataset durable across sessions with a moderate amount of
  added complexity.
- **CSV export** of the current filtered view, not just import — a
  natural companion to the import feature that I didn't have time for.
- **Multi-field sort** (shift-click to add a secondary sort key), which
  `@tanstack/react-table` mostly gives me for free but I didn't wire up
  the UI for.
- **Delta-based worker sync**, described above under "what breaks at
  10x" — the highest-leverage perf change if the dataset size grows.
