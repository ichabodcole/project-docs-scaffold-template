# Model Browser UI — Additions Beyond Recipe

**Date:** 2026-03-05 **Context:** `recipes:openrouter-model-categories` recipe
was used as a starting point for the admin UI. This report documents UI features
added during implementation that aren't covered by the recipe, for feeding back
into the recipe.

---

## Features Added

### 1. Newest-First Sort (via `created` timestamp)

OpenRouter models include a `created` timestamp. Added as a sort option
(defaulting to newest first) so admins can quickly find recently added models.

**Recipe impact:** The recipe mentions sort by name and price. Add "newest
first" as a recommended default sort, and note that the `created` field should
be included in the Zod schema and `CatalogModel` interface.

### 2. Hide/Show Models via localStorage

Models can be hidden from the browser list by clicking an eye icon. Hidden model
IDs persist in `localStorage` (via VueUse `useLocalStorage`). A three-state
cycle button controls visibility:

- **Default:** hidden models filtered out, count shown in header (e.g., "12
  hidden")
- **Show all:** hidden models visible but dimmed (opacity-50)
- **Hidden only:** only hidden models shown

**Recipe impact:** New section. This is a significant UX improvement when
browsing 300+ models — admins can progressively filter down to a working set.
Pattern: `useLocalStorage<string[]>('app-hidden-models', [])` → computed `Set`
for O(1) lookups → three-state filter cycle.

### 3. Optional Description Search Toggle

A toggle button switches Fuse.js between searching name/ID only vs. including
model descriptions. When descriptions are included:

- Keys become weighted: `name` and `id` at weight 2, `description` at weight 1
- `ignoreLocation: true` is enabled (critical — see gotcha below)

**Recipe impact:** The recipe mentions Fuse.js with threshold 0.3. Update to
recommend:

- Threshold 0.4 (0.3 was too strict in practice)
- Weighted keys when searching descriptions
- `ignoreLocation: true` as a required setting for description search

**Gotcha — `ignoreLocation` is essential for description search:** Without it,
Fuse.js penalizes matches that appear far from the start of the string. Model
descriptions are long paragraphs, so a keyword like "vision" appearing in the
middle gets a poor score and may not surface at all. Setting
`ignoreLocation: true` disables this positional penalty. This was a real bug
during implementation — description search appeared broken until this was added.

### 4. Modality Filter

Dropdown filter for multimodal capabilities:

- All Modalities (default)
- Multimodal Input (accepts non-text input like images)
- Multimodal Output (produces non-text output)
- Multimodal Both

Uses a simple check:
`modalities.length > 1 || modalities.some(m => m !== 'text')`.

**Recipe impact:** New section. Useful for narrowing down models when assigning
to vision or image-generation categories.

### 5. Per-Million Token Pricing

Model browser displays pricing as per-million tokens (e.g., "$0.15/M") instead
of per-token. The detail pane has a toggle button to switch between per-million
and per-token views.

**Recipe impact:** The recipe warns about string pricing and float precision.
Add: display as per-million is standard industry convention and more readable.
Formula: `parseFloat(price) * 1_000_000`. Handle edge cases: `0` → "Free", very
small values (`< 0.01/M`) → show 4 decimal places.

### 6. Category List Selection Highlighting

Clicking a category in the config list highlights it with a primary-colored
border and tinted background, matching the same visual pattern used in the model
browser for the current model.

**Recipe impact:** The recipe describes a table layout for categories. Recommend
styled card/button rows instead of a plain data table — enables per-row
interactive styling (selection state, hover) that tables don't handle well.

### 7. View Model Details from Config Row

Each config row has an info button that, when clicked, finds the corresponding
model in the catalog data and shows it in the detail pane. This lets admins
quickly inspect what model a category is currently using without scrolling
through the browser.

**Recipe impact:** New interaction. Requires the parent page to look up the
catalog model by ID and set it as the selected model. Pattern:
`catalogModels.find(m => m.id === config.modelId)`.

### 8. Global cursor:pointer CSS

Added a global CSS rule for interactive elements:

```css
button,
[role="button"],
a[href],
select,
summary {
  cursor: pointer;
}
```

**Recipe impact:** Minor but worth noting — Nuxt UI components don't always set
`cursor: pointer` by default.

## Implementation Gotchas

### useFetch vs $fetch for Client-Only API Calls

When the admin UI proxies API calls through Nuxt's dev server (`devProxy`), data
fetching with `useFetch` fails on direct page load (refresh). The proxy isn't
available during SSR, so `useFetch` caches a null result that persists on the
client.

**Fix:** Use `$fetch` inside `onMounted()` for data that should only load
client-side:

```typescript
onMounted(() => {
  fetchConfigs(); // uses $fetch internally
  fetchCatalog();
});
```

**Recipe impact:** Add to gotchas section. This is framework-specific (Nuxt) but
the general principle applies: if your admin UI proxies to a separate API
server, ensure data fetching is client-only.

### Fuse.js Threshold Tuning

The recipe suggests threshold 0.3. In practice, 0.4 worked better for model
names which often contain slashes, version numbers, and provider prefixes (e.g.,
"anthropic/claude-sonnet-4-20250514"). Too strict a threshold meant partial name
matches didn't surface.

### Three-State UI Cycle Pattern

The hidden filter uses a single button that cycles through three states. This is
more compact than a dropdown for a three-option toggle. Implementation pattern:

```typescript
function cycleFilter() {
  if (filter.value === "a") filter.value = "b";
  else if (filter.value === "b") filter.value = "c";
  else filter.value = "a";
}
```

Use different icons and solid/outline variants to indicate the current state.
Avoid array-index cycling (`order[(idx + 1) % order.length]`) — TypeScript
strict mode returns `T | undefined` from array indexing, making it awkward.
