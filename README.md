# Catalog Manager

A product-catalog table for browsing 10k–100k records across 60 columns.
React 19 + TypeScript + Vite, no backend — generation, search, sorting
and CSV parsing all happen in the browser.

**Domain:** product/inventory catalog. SKU, pricing, stock, warehouse,
supplier, logistics and merchandising fields, 60 in total.

```bash
npm install
npm run dev           # http://localhost:5173
npm run build         # production build
npm run lint          # oxlint
npm run sanity-check  # node-side checks for generation, filtering, CSV
```

Everything lives in memory; a refresh regenerates the seed dataset.

## What's in it

**Search and filter.** A global search box across SKU, name, brand,
category, supplier, tags and a few more, plus a filter popover for
category, status and price/stock ranges. Both run in a Web Worker
(`src/workers/searchWorker.ts`), debounced 120ms.

**Sorting.** Click a header to cycle asc → desc → unsorted. Numeric
fields compare as numbers, text through an `Intl.Collator` (so `Amber`
and `amber` group together and `WH-EAST-2` sorts before `WH-EAST-10`).
Empty values sort last in both directions rather than counting as zero.
The sort runs inside a React transition, so a 100k-row re-sort doesn't
block typing or scrolling.

**60 columns.** A Columns panel with count presets (10/20/40/60),
per-field checkboxes and a field search. Rows always carry all 60
fields; only display is restricted, so toggling is instant. Columns are
drag-resizable from their header edge. The checkbox column and the first
data column stay pinned while the remaining ~8000px scrolls.

**Row virtualization.** `@tanstack/react-virtual` renders only the
visible window, so 10k and 100k cost about the same to render.

**Create / edit / delete.** One schema-driven form does create and edit:
9 core fields up front, the other 51 under "advanced", validation off the
schema. Delete is per-row from the detail panel or bulk by checkbox
selection, both through a confirm dialog.

**CSV import and export.** Import is drag-and-drop or file picker, parsed
with PapaParse in its own worker, with a preview of which headers matched
which fields before anything commits. Headers match on key *or* label,
case- and punctuation-insensitively, so `stockQty`, `Stock Qty` and
`stock_qty` all land in the same column. Export writes the current
filtered rows with the currently visible columns.

**Detail panel.** Clicking a row shows all 60 fields regardless of which
columns are on, with empty fields collapsed behind a toggle. The table is
the scan view; this is the "give me everything" view.

## Measured numbers

Chrome on this machine, taken from `PerformanceObserver` long-task
entries rather than estimated:

| | |
|---|---|
| Sort any column, 10k rows, 60 columns | no long task recorded |
| Sort any column, 100k rows, 60 columns | ~720ms, inside a transition |
| Regenerate to 100k, 11 columns | ~1,040ms, behind a progress overlay |
| Regenerate to 100k, 60 columns | ~2,370ms, behind a progress overlay |
| Substring scan over 100k rows (worker) | ~8ms |

The regenerate figures are the honest weak spot: generation itself is
~700ms and the rest is React committing a fresh 100k-row table. It's a
deliberate blocking operation with an overlay in front of it rather than
something I hid.

For contrast, sorting a numeric column at 10k took **34.5 seconds**
before I profiled it. See `prompt.md`.

## The decision I'm least sure about

Running search and filtering in a **Web Worker** instead of a `useMemo`
on the main thread.

A full substring scan over 100k rows takes about 8ms
(`npm run sanity-check` prints it). That's already invisible, so the
worker isn't solving a problem I can currently observe — and it costs a
second copy of the dataset, a sync path, a debounce, and request-id
bookkeeping so a stale result can't overwrite a fresh one.

What made me keep it is that the sync cost is the interesting part, and I
only understood it after building it. `postMessage` structured-clones
synchronously *on the calling thread*, so the naive version — re-sync the
full dataset on every add, delete and import — was spending more
main-thread time on the clone than the filter would ever have cost. The
fix was to sync lazily: the worker doesn't hear about the dataset until a
filter actually needs it, and an empty search box skips the round trip
entirely. So the worker is now genuinely free when unused.

A reviewer could reasonably say the main-thread version is the right call
at this scale, and they'd be right on today's numbers. I'd defend the
worker as the version that doesn't need revisiting when the filter gets
heavier (fuzzy matching, multi-field scoring) rather than as a fix for an
observed stall.

## What breaks first at 10x (~1M rows)

1. **Memory.** 1M rows × 60 fields as JS objects, held on the main thread
   and again in the worker once a filter runs. Several hundred MB. This
   is the ceiling, not CPU.
2. **The full worker sync.** Lazy sync avoids paying it repeatedly, but
   the first search after a mutation still clones the whole dataset. At
   1M that's a visible stall. The fix is delta sync: send added/removed
   ids and patch the worker's copy in place.
3. **Sorting.** ~720ms at 100k, so somewhere around 8s at 1M. A React
   transition hides latency but doesn't remove it. I'd move the sort into
   the worker next to the filter, since it already holds the data.
4. **Generation.** ~700ms at 100k, so ~7s at 1M, entirely blocking. It
   would have to move into the worker or be chunked across frames.
5. **Holding it in the browser at all.** Past a few million rows this
   stops being a client-side data-modelling problem and becomes
   cursor-based pagination against a server. That's an architecture
   change rather than a tuning pass, which is why it's last.

## What I'd do next

- **Undo for delete.** A "Deleted 12 records · Undo" toast holding the
  rows for a few seconds would be safer than the confirm dialog *and*
  let me drop the dialog.
- **Column reordering.** Visibility and resizing are covered; drag-to-
  reorder isn't, and on a 60-column table that's a real gap.
- **Multi-column sort** (shift-click for a secondary key).
- **Persistence.** IndexedDB would survive a reload without a backend.
- **Delta worker sync**, per point 2 above — the highest-leverage change
  if the dataset grows.

## Notes on structure

```
src/
  data/schema.ts        60 field definitions — the single source of truth
  data/generateData.ts  seeded PRNG generator
  store/useTableStore.ts  zustand: records, selection, filters, columns
  hooks/useFilteredRecords.ts  worker orchestration + debounce
  workers/searchWorker.ts      the scan itself
  components/DataTable/        virtualized table, sorting, resizing
```

`schema.ts` drives the generator, the columns, the form inputs, CSV
header matching and the detail panel. Adding a 61st field means adding
one entry there and nothing else.
