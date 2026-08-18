# How I used AI on this

Short version: AI wrote most of the first draft, I spent the rest of the
time measuring it and taking things out. The parts of this codebase I'd
actually defend in review are the parts where the first draft was wrong.

## The workflow

I used an agentic coding assistant (Claude) with shell and file access,
not editor autocomplete. That means the loop was:

1. Decide the domain and the schema myself — product catalog, 60 fields,
   because a data-table assignment lives or dies on whether the data has
   enough shape to make column visibility, sorting and filtering feel
   like real problems instead of a demo.
2. Have it scaffold a vertical slice: schema → generator → store →
   worker → table → toolbar → forms.
3. Run it, profile it, read the diff, and push back.

Step 3 is where the time went, and it's the only part worth writing
about.

## What the first draft got wrong

I'm listing these because "AI wrote it and it worked" isn't interesting.
What's interesting is that it looked like it worked.

**Sorting a numeric column took 34 seconds at 10k rows.** The generated
code passed `sortingFn: 'alphanumeric'` to TanStack Table for every
numeric field. That sorting function tokenises both operands with a
regex on every comparison, so an n log n sort becomes millions of regex
executions. Sorting a *text* column took 166ms; the numeric one took
34,477ms. It reads fine — "alphanumeric" is a plausible-sounding name
for "sorts numbers" — and you'd never catch it by reading. I caught it by
clicking a header and watching the tab hang.

That sent me looking at what TanStack's row model was costing generally.
At 100k rows a sort was ~3.6s of row-model rebuild on top of a
comparator that takes 181ms on its own. Since I was already doing my own
filtering in a worker and my own virtualisation, the row model was
doing work I never used. I removed `@tanstack/react-table`, kept
`@tanstack/react-virtual`, and sorted the array with an `Intl.Collator`
comparator. That's 47kB less JS and a sort that no longer registers as a
long task at 10k.

**The pinned columns leaked.** The sticky SKU column was given
`bg-slate-50/40` on alternating rows. A translucent background over
horizontally scrolled content means you can read the scrolled content
straight through the pinned column. It's obvious in a screenshot and
invisible in code review. Same class of bug on the header: it was
`position: sticky` on `<thead>` with `border-collapse`, which lets rows
paint over the stuck header in Chrome.

**The downloadable CSV template was malformed.** `generateSampleCsv()`
built a header row from the 9 fields marked `core`, and had two
hard-coded data rows with 8 values each. Importing the app's own
template shifted every field one column left — brand landed in
subcategory, price in brand. The original sanity check "verified" the
template by checking that its headers mapped to known fields, which they
did. It never checked that the rows lined up with them. That's a very
particular kind of AI-written test: it tests the thing that's easy to
assert rather than the thing that breaks.

**The generated data contradicted itself.** `supplierEmail` was derived
from a freshly-picked random supplier rather than the row's own, so a row
would say "Summit Wholesale" and `orders@pacificrimimports.com`.
`discontinued` and `status: 'Discontinued'` were independent coin flips.
`discountPct` was populated on rows with `isOnSale: false`. None of it
breaks anything; all of it makes the table look wrong the moment someone
actually reads a row, which is the first thing a reviewer does.

**The table didn't fill its container** — a 1554px table sitting in a
1910px pane with dead white space to the right, because the width was
pinned to the sum of the column widths with no spacer column.

## What I changed structurally

Beyond fixing the above:

- **Edit.** The first draft had create, read and delete but no update,
  and then listed "edit-in-place" under future work. A CRUD table
  without the U isn't finished. The form is now schema-driven for both
  create and edit.
- **The worker only hears about the dataset when it's needed.**
  `postMessage` structured-clones synchronously *on the calling thread*,
  so re-syncing 100k × 60-field objects to the search worker on every
  mutation was paying a large main-thread cost to avoid a smaller one.
  It now syncs lazily, on the first filter that actually needs it, and
  an empty search box skips the worker round trip entirely.
- **Escape and click-outside** on every popover, modal and drawer; the
  original had click-outside on exactly one of them.
- **`strict: true`**, which wasn't on.

## Where AI was genuinely good

Breadth. A 60-field schema, a generator that fills all of it plausibly,
and a form that renders nine input types off that schema is a lot of
tedious, low-risk typing, and it produced it correctly and fast. Same for
the CSV header-matching (key or label, punctuation-insensitive) — fiddly,
well-specified, easy to verify.

It's also good at the thing it's stereotyped as bad at: when I told it
the numeric sort was slow and gave it the two timings, it identified the
`alphanumeric` tokeniser immediately. It just wasn't going to notice on
its own, because nothing in the code looks wrong.

## Where it's weak, and what I'd tell someone starting this

The failure mode isn't broken code, it's *plausible* code. Every bug
above survived type-checking, linting and a passing sanity script. They
all needed either a measurement or a screenshot to find.

So: budget your time for verification, not generation. The generation is
the cheap part now. I'd rather submit something where I can tell you why
each dependency is there and what the slowest interaction costs in
milliseconds than something twice the size that I've only read.
