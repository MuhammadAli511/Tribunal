/**
 * Seed the Historian with past case summaries for the demo.
 *
 * Usage:
 *   npx tsx scripts/seed-history.ts [BASE_URL]
 *
 * Defaults to http://localhost:8787 if no URL is provided.
 * After deploying, run with your production URL:
 *   npx tsx scripts/seed-history.ts https://tribunal.<your-subdomain>.workers.dev
 */

const BASE_URL = process.argv[2] || "http://localhost:8787";

const SEED_CASES = [
  {
    caseId: "seed-pricing-2025-01",
    briefSnippet:
      "Raise enterprise pricing by 40% across all tiers to improve margins and fund R&D expansion",
    ruling: "conditional" as const,
    summary:
      "The tribunal reviewed a proposal to raise enterprise pricing by 40%. The Prosecutor argued this risked churning mid-tier customers who were already price-sensitive. The Defender highlighted that competitors had raised prices by 25-35% in the past year with minimal churn. The Domain Expert noted that the company's NPS among enterprise clients was 72, well above the threshold for price tolerance. The Historian found no precedent for a 40% single increase succeeding without grandfathering existing contracts. Ruling: CONDITIONAL — proceed with a 25% increase for new contracts and phase the remaining 15% over 12 months for existing customers. Key factors: competitor pricing data, customer NPS score, and churn risk on existing contracts.",
  },
  {
    caseId: "seed-hiring-2025-03",
    briefSnippet:
      "Hire a dedicated VP of Engineering instead of promoting the current senior engineering lead",
    ruling: "do-not-proceed" as const,
    summary:
      "The tribunal reviewed whether to hire an external VP of Engineering. The Prosecutor argued that the current senior lead had built the entire platform and had strong team trust. The Defender countered that the company needed someone with experience scaling from 20 to 100 engineers. The Domain Expert cited research showing external VP hires have a 45% failure rate in the first 18 months at companies under 50 employees. The Historian noted a similar decision at a previous company that resulted in 3 senior engineer departures. Ruling: DO NOT PROCEED — promote the internal candidate with an executive coach and revisit in 12 months. Key factors: team retention risk, external hire failure rate, and the internal candidate's deep technical context.",
  },
  {
    caseId: "seed-product-2025-02",
    briefSnippet:
      "Pivot the product roadmap to focus exclusively on AI features, pausing the planned analytics dashboard",
    ruling: "proceed" as const,
    summary:
      "The tribunal reviewed a proposal to pivot the roadmap toward AI features, shelving the analytics dashboard. The Prosecutor warned that 30% of enterprise pipeline mentioned analytics as a buying factor. The Defender argued that AI features would create a defensible moat and that analytics could be commoditized via partnerships. The Domain Expert showed that market demand for AI-native tools had grown 280% year-over-year. The Historian found that the company's previous pivot (from on-prem to cloud) was delayed 6 months by trying to maintain both tracks simultaneously. Ruling: PROCEED — focus on AI features immediately. Key factors: market timing advantage (280% growth), historical lesson about split focus, and partnership options for analytics gap.",
  },
];

async function seed() {
  console.log(`Seeding historian at ${BASE_URL}...`);

  const res = await fetch(`${BASE_URL}/api/seed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cases: SEED_CASES }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`Seed failed (${res.status}): ${text}`);
    process.exit(1);
  }

  const result = await res.json();
  console.log(`Seeded ${(result as { seeded: number }).seeded} cases.`);

  // Verify
  const listRes = await fetch(`${BASE_URL}/api/cases`);
  if (listRes.ok) {
    const cases = await listRes.json();
    console.log(`Historian now has ${(cases as unknown[]).length} case(s).`);
  }
}

seed().catch(console.error);
