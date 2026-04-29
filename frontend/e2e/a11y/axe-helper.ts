import AxeBuilder from "@axe-core/playwright";
import type { Page, TestInfo } from "@playwright/test";
import type { AxeResults, Result, NodeResult } from "axe-core";
import * as fs from "fs";
import * as path from "path";

/**
 * Severity levels we treat as merge-blocking. The full axe scale is
 * `minor | moderate | serious | critical`; we block on the latter two.
 *
 * Override per-test via `runAxe(page, info, { failOn: ["critical"] })` if
 * a page intentionally ships a known moderate issue while it's being fixed.
 */
export const DEFAULT_FAIL_SEVERITIES = ["serious", "critical"] as const;

export type FailSeverity = "minor" | "moderate" | "serious" | "critical";

export interface RunAxeOptions {
  /** Severity levels that fail the test. Defaults to serious + critical. */
  failOn?: ReadonlyArray<FailSeverity>;
  /** axe rule IDs to ignore (use sparingly — prefer fixing the page). */
  disableRules?: string[];
  /** Restrict scan to a CSS selector instead of the entire document. */
  include?: string;
  /** Skip subtrees (e.g. third-party widgets) by CSS selector. */
  exclude?: string[];
  /** Override WCAG tag selection. Defaults to WCAG 2.1 A + AA + best-practice. */
  withTags?: string[];
  /** Custom artifact filename (defaults to `<sanitized test title>.json`). */
  artifactName?: string;
}

const DEFAULT_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"];

/**
 * Run axe-core against the current page state, persist a JSON report as a
 * Playwright attachment, and fail the test when violations meet the configured
 * severity threshold. The error message names every impacted element so a
 * reviewer can fix the page without opening the artifact.
 */
export async function runAxe(
  page: Page,
  testInfo: TestInfo,
  opts: RunAxeOptions = {},
): Promise<AxeResults> {
  const failOn = opts.failOn ?? DEFAULT_FAIL_SEVERITIES;
  const tags = opts.withTags ?? DEFAULT_TAGS;

  let builder = new AxeBuilder({ page }).withTags(tags);
  if (opts.include) builder = builder.include(opts.include);
  if (opts.exclude?.length) {
    for (const sel of opts.exclude) builder = builder.exclude(sel);
  }
  if (opts.disableRules?.length) builder = builder.disableRules(opts.disableRules);

  const results = await builder.analyze();

  const reportName = opts.artifactName ?? `${slug(testInfo.title)}.json`;
  await testInfo.attach(reportName, {
    body: JSON.stringify(results, null, 2),
    contentType: "application/json",
  });

  // Always emit a markdown summary to the reports/ folder so CI can read it
  // even when the test passes (we publish a per-page table either way).
  writeMarkdownSummary(reportName.replace(/\.json$/, ".md"), results, testInfo.title);

  const blocking = results.violations.filter((v) =>
    failOn.includes((v.impact ?? "minor") as FailSeverity),
  );
  if (blocking.length > 0) {
    throw new Error(formatViolations(blocking, failOn));
  }
  return results;
}

function slug(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/**
 * Produce a reviewer-friendly message that names every impacted element.
 *
 * Example:
 *   3 a11y violations at severities critical, serious:
 *     [critical] color-contrast — Elements must meet minimum color contrast ratio thresholds
 *       Help: https://dequeuniversity.com/rules/axe/4.7/color-contrast
 *       button.cta:nth-of-type(1)
 *         Fix any of: Element has insufficient color contrast of 2.83 (foreground color: #888…)
 */
export function formatViolations(
  violations: Result[],
  failOn: ReadonlyArray<FailSeverity>,
): string {
  const lines: string[] = [
    `${violations.length} a11y violation(s) at severities ${failOn.join(", ")}:`,
    "",
  ];
  for (const v of violations) {
    lines.push(`  [${v.impact}] ${v.id} — ${v.description}`);
    lines.push(`    Help: ${v.helpUrl}`);
    for (const node of v.nodes) {
      const target = (node.target as string[]).join(" ");
      lines.push(`    ${target}`);
      const fix = formatNodeFix(node);
      if (fix) lines.push(`      ${fix}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

function formatNodeFix(node: NodeResult): string | null {
  if (node.failureSummary) {
    return node.failureSummary.replace(/\n/g, " ");
  }
  const any = node.any?.[0]?.message;
  const all = node.all?.[0]?.message;
  return any ?? all ?? null;
}

const REPORTS_DIR = path.resolve(process.cwd(), "playwright-report", "a11y");

function writeMarkdownSummary(filename: string, results: AxeResults, title: string): void {
  try {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  } catch {
    return;
  }
  const dest = path.join(REPORTS_DIR, filename);

  const counts = countBySeverity(results.violations);
  const lines = [
    `# Accessibility report — ${title}`,
    "",
    `URL: \`${results.url}\``,
    `Run at: ${results.timestamp}`,
    "",
    `| Severity | Count |`,
    `|----------|-------|`,
    `| critical | ${counts.critical} |`,
    `| serious  | ${counts.serious} |`,
    `| moderate | ${counts.moderate} |`,
    `| minor    | ${counts.minor} |`,
    `| passes   | ${results.passes.length} |`,
    `| incomplete | ${results.incomplete.length} |`,
    "",
  ];

  if (results.violations.length === 0) {
    lines.push("No violations.");
  } else {
    lines.push("## Violations");
    lines.push("");
    for (const v of results.violations) {
      lines.push(`### [${v.impact}] ${v.id} — ${v.help}`);
      lines.push("");
      lines.push(`${v.description}`);
      lines.push("");
      lines.push(`Help: ${v.helpUrl}`);
      lines.push("");
      lines.push("| Selector | Failure |");
      lines.push("|----------|---------|");
      for (const node of v.nodes) {
        const target = (node.target as string[]).join(" ");
        const summary =
          (node.failureSummary ?? formatNodeFix(node) ?? "—").replace(/\|/g, "\\|").replace(
            /\n/g,
            " ",
          );
        lines.push(`| \`${target}\` | ${summary} |`);
      }
      lines.push("");
    }
  }

  fs.writeFileSync(dest, lines.join("\n"));
}

function countBySeverity(violations: Result[]): Record<FailSeverity, number> {
  const counts: Record<FailSeverity, number> = {
    critical: 0,
    serious: 0,
    moderate: 0,
    minor: 0,
  };
  for (const v of violations) {
    const key = (v.impact ?? "minor") as FailSeverity;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}
