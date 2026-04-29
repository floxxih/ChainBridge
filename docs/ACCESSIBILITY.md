# Frontend Accessibility

ChainBridge ships axe-core checks as a required CI gate. Every pull request
that touches `frontend/**` runs the [`frontend-a11y.yml`](../.github/workflows/frontend-a11y.yml)
workflow, which scans every key page with axe-core (4.x) via
[`@axe-core/playwright`](https://www.npmjs.com/package/@axe-core/playwright).

## What's covered

| Page | Route |
|------|-------|
| Home / Swap | `/` |
| Browse Orders | `/browse` |
| Track Swaps | `/track` |
| Dashboard | `/dashboard` |
| Fee Estimator | `/fees` |
| 404 Not Found | any unmatched route |
| Home with mobile menu open | `/` (interactive state) |

Tests live in [`frontend/e2e/a11y/`](../frontend/e2e/a11y) and are scoped to a
dedicated `a11y` Playwright project so they don't run as part of regular smoke
tests.

## Severity policy

axe-core classifies findings as `minor`, `moderate`, `serious`, or `critical`.
ChainBridge's policy:

| Severity | CI behaviour |
|----------|--------------|
| `critical` | **Fails CI**. Must be fixed or formally exempted before merge. |
| `serious` | **Fails CI**. Same as above. |
| `moderate` | Reported in the PR comment + GitHub Step Summary, does not block merge. |
| `minor` | Same as moderate. |

Override per-test via `runAxe(page, info, { failOn: ["critical"] })` if a known
moderate issue is being tracked separately — but prefer fixing the page.

## Reports

Every axe run produces three artifacts:

1. **Inline error message** — the test failure message lists each violation,
   its severity, and the CSS selector for every impacted element. Example:

   ```
   3 a11y violation(s) at severities serious, critical:
     [critical] color-contrast — Elements must meet minimum color contrast
       Help: https://dequeuniversity.com/rules/axe/4.7/color-contrast
       button.cta:nth-of-type(1)
         Fix any of: Element has insufficient color contrast of 2.83 …
   ```

2. **JSON attachment** in the Playwright HTML report — full axe results
   including HTML for each impacted node.

3. **Markdown summary** in `frontend/playwright-report/a11y/*.md` — a per-page
   table of `(selector, failure summary)` pairs, uploaded as the
   `a11y-summaries` artifact and pasted into the PR comment + the GitHub
   workflow Step Summary.

## Running locally

```bash
cd frontend
npm install
npx playwright install --with-deps chromium
npm run test:a11y           # interactive
npm run test:a11y:ci        # CI mode (list + JSON reporters)
```

Open the HTML report afterwards with:

```bash
npm run test:e2e:report
```

## Branch protection

To make the check actually block merges, add **Frontend Accessibility / axe-core (key pages)**
to the required status checks list in:

```
Settings → Branches → Branch protection rules → master/main
```

The job fails on `serious` or `critical` axe findings, so once it's required
the gate is fully automated.

## Adding a new page

1. Add the route to `KEY_PAGES` in `frontend/e2e/a11y/pages.spec.ts`.
2. Run `npm run test:a11y` locally to confirm it's clean before pushing.
3. If the page renders third-party iframes you don't control, exclude them via
   `runAxe(page, info, { exclude: ["#widget-id"] })` rather than disabling
   rules globally.

## Adding an interactive-state test

Some violations only appear once a menu opens, a modal mounts, or a form is in
its error state. Drive the page to the interesting state, then call `runAxe`:

```ts
test("Order modal — error state", async ({ page }, info) => {
  await page.goto("/browse");
  await page.getByRole("button", { name: /create order/i }).click();
  await page.getByRole("button", { name: /submit/i }).click(); // triggers errors
  await runAxe(page, info, { artifactName: "create-order-modal-errors.json" });
});
```

## Why axe?

axe-core is the most widely adopted accessibility engine: it powers Chrome
DevTools' Lighthouse a11y audits, axe DevTools, the Storybook a11y addon, and
GitHub's own accessibility reviews. Using the same rule set in CI means devs
see the same findings locally as the CI gate produces.
