// scripts/force-index.mjs
// Force Google to crawl all published KIRA pages immediately via the Indexing API.
//
// SETUP (one-time, Henry does this in browser — no CLI needed):
// ─────────────────────────────────────────────────────────────
// 1. Google Cloud Console → APIs & Services → Enable "Web Search Indexing API"
// 2. IAM & Admin → Service Accounts → Create
//    Name: kira-indexing-bot   Role: Owner
//    Keys tab → Add Key → JSON → download → save as "indexing-sa.json" in this folder
// 3. Google Search Console → Settings → Users & Permissions → Add user
//    Email = the service account email (kira-indexing-bot@YOUR-PROJECT.iam.gserviceaccount.com)
//    Permission = OWNER  (must be Owner, not Verified Owner)
// 4. Run: node scripts/force-index.mjs
//
// Quota: 200 URL submissions/day. Script auto-batches if list exceeds that.
// ─────────────────────────────────────────────────────────────

import { google } from 'googleapis';

const SA_KEY_PATH = new URL('./indexing-sa.json', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
const DAILY_QUOTA = 200;
const DELAY_MS    = 500;

// ── All live URLs on kiraresearch.com ─────────────────────────────────────────

const CORE = [
  'https://kiraresearch.com/en/',
  'https://kiraresearch.com/en/library',
  'https://kiraresearch.com/en/insights/',
  'https://kiraresearch.com/en/methodology',
  'https://kiraresearch.com/en/about',
  'https://kiraresearch.com/en/custom-research/',
  'https://kiraresearch.com/en/companies/',
  'https://kiraresearch.com/en/companies/vn/',
  'https://kiraresearch.com/ja/',
  'https://kiraresearch.com/ja/library',
  'https://kiraresearch.com/ja/insights/',
  'https://kiraresearch.com/ko/',
  'https://kiraresearch.com/ko/library',
  'https://kiraresearch.com/ko/insights/',
];

const REPORT_SLUGS = [
  'tourism-philippines-2027','property-philippines-2026','renewable-energy-philippines-2027',
  'mining-philippines-2026','malaysia-medical-tourism-2026','malaysia-renewable-energy-2027',
  'malaysia-halal-food-2026','malaysia-palm-oil-2027','data-center-malaysia-2026',
  'condominium-thailand-2026','thailand-medical-devices-2027','petrochemicals-thailand-2026',
  'thailand-automotive-2027','data-center-thailand-2026','cold-chain-indonesia-2026',
  'data-center-indonesia-2026','automotive-indonesia-2027','property-development-indonesia-2027',
  'halal-beauty-indonesia-2026','indonesia-nickel-battery-2026','dairy-vietnam-2026',
  'edtech-vietnam-2027','banking-vietnam-2026','textile-vietnam-2026','data-center-vietnam-2027',
  'automotive-parts-vietnam-2026','snack-foods-south-korea-2026','pharma-south-korea-2027',
  'fintech-south-korea-2026','streaming-south-korea-2027','beauty-south-korea-2026',
  'bakery-japan-2026','tourism-japan-2027','medical-devices-japan-2026','cybersecurity-japan-2027',
  'mobile-gaming-japan-2026','legal-services-singapore-2026','philippines-retail-2026',
  'singapore-coworking-2027','singapore-cybersecurity-2026','telemedicine-philippines-2027',
  'manufacturing-malaysia-2027','cross-border-payments-philippines-2027','philippines-fintech-2026',
  'vietnam-tourism-2027','philippines-bpo-2026','malaysia-cloud-infrastructure-2026',
  'malaysia-construction-2026','malaysia-wealth-management-2027','malaysia-beauty-2026',
  'cybersecurity-thailand-2027','rice-thailand-2026','insurance-thailand-2027',
  'wellness-thailand-2026','thailand-quick-service-restaurants-2026','thailand-ev-2027',
  'thailand-tourism-2026','indonesia-fmcg-2027','renewable-energy-indonesia-2026',
  'indonesia-palm-oil-2026',
];

const INSIGHT_SLUGS = [
  'beauty-south-korea-dermocosmetics-growth-2026','beauty-south-korea-top-players-2026',
  'beauty-south-korea-export-market-size-2026','bakery-japan-top-players-2026',
  'bakery-japan-segment-breakdown-2026','bakery-japan-distribution-channels-2026',
  'tourism-japan-regional-dispersal-2027','tourism-japan-ai-hospitality-2027',
  'tourism-japan-china-shock-2027','manufacturing-malaysia-unit-economics-2027',
  'manufacturing-malaysia-ai-impact-2027','manufacturing-malaysia-market-size-2027',
  'tourism-vietnam-market-size-growth-2027','fintech-korea-market-size-2027',
  'fintech-korea-competitive-landscape-2027','fintech-korea-regulatory-evolution-2027',
  'healthcare-vietnam-market-size-2027','healthcare-vietnam-private-hospitals-2027',
  'healthcare-vietnam-bhyt-medtech-2027','automotive-japan-ev-transition-2027',
  'automotive-japan-competitive-landscape-2027','automotive-japan-chinese-ev-threat-2027',
  'beauty-korea-export-trajectory-2027','beauty-korea-competitive-landscape-2027',
  'beauty-korea-export-diversification-2027','ev-malaysia-market-size-2027',
  'ev-malaysia-policy-incentives-2027','ev-malaysia-chinese-oem-strategy-2027',
  'fmcg-philippines-market-growth-2027','fmcg-philippines-competitive-landscape-2027',
  'fmcg-philippines-sari-sari-digitization-2027','retail-japan-market-size-2027',
  'retail-japan-competitive-landscape-2027','retail-japan-convenience-evolution-2027',
  'coffee-vietnam-market-growth-2027','coffee-vietnam-competitive-landscape-2027',
  'coffee-vietnam-specialty-export-shift-2027','retail-thailand-market-size-2027',
  'retail-thailand-competitive-landscape-2027','retail-thailand-ecommerce-omnichannel-2027',
  'fintech-singapore-market-growth-2027','fintech-singapore-regulation-2027',
  'fintech-singapore-embedded-finance-2027','tourism-vietnam-apec-luxury-supply-pipeline-2027',
  'tourism-vietnam-yield-per-visitor-inflection-2027','tourism-vietnam-korean-inbound-recovery-2027',
  'tourism-vietnam-luxury-adr-segment-economics-2027','cybersecurity-thailand-competitive-landscape-2027',
  'cybersecurity-thailand-market-size-2027','cybersecurity-thailand-regulatory-framework-2027',
  'ev-thailand-chinese-brands-strategy-2027','ev-thailand-competitive-landscape-2027',
  'ev-thailand-market-size-2027','insurance-thailand-competitive-landscape-2027',
  'insurance-thailand-digital-insurtech-2027','insurance-thailand-market-size-2027',
  'ai-services-singapore-market-size-2027','ai-services-singapore-competitive-landscape-2027',
  'ai-services-singapore-regulatory-framework-2027','coworking-singapore-competitive-landscape-2027',
  'coworking-singapore-future-of-work-2027','coworking-singapore-market-size-2027',
  'cross-border-payments-philippines-competitive-landscape-2027',
  'cross-border-payments-philippines-market-size-2027',
  'cross-border-payments-philippines-regulatory-framework-2027',
  'telemedicine-philippines-competitive-landscape-2027','telemedicine-philippines-market-size-2027',
  'telemedicine-philippines-regulatory-framework-2027','islamic-finance-malaysia-market-size-2027',
  'islamic-finance-malaysia-competitive-landscape-2027','islamic-finance-malaysia-digital-sukuk-2027',
  'semiconductor-malaysia-market-size-2027','semiconductor-malaysia-competitive-landscape-2027',
  'semiconductor-malaysia-advanced-packaging-2027','cybersecurity-japan-competitive-landscape-2027',
  'cybersecurity-japan-market-size-2027','cybersecurity-japan-regulatory-framework-2027',
  'ecommerce-indonesia-competitive-landscape-2027','ecommerce-indonesia-market-size-2027',
  'ecommerce-indonesia-social-commerce-2027','ev-indonesia-battery-supply-chain-2027',
  'ev-indonesia-competitive-landscape-2027','ev-indonesia-market-size-2027',
  'fmcg-indonesia-competitive-landscape-2027','fmcg-indonesia-market-size-2027',
  'fmcg-indonesia-modern-trade-ecommerce-2027','logistics-vietnam-cold-chain-expansion-2026',
  'logistics-vietnam-last-mile-top-players-2026','logistics-vietnam-segment-unit-economics-2026',
  'legal-services-singapore-competitive-landscape-2026','legal-services-singapore-legaltech-ai-2026',
  'legal-services-singapore-market-size-2026','qsr-thailand-competitive-landscape-2026',
  'qsr-thailand-delivery-digitalization-2026','qsr-thailand-market-size-2026',
  'retail-philippines-competitive-landscape-2026','retail-philippines-ecommerce-omnichannel-2026',
  'retail-philippines-market-size-2026','construction-malaysia-competitive-landscape-2026',
  'construction-malaysia-ibs-prefab-adoption-2026','construction-malaysia-market-size-2026',
  'cybersecurity-singapore-competitive-landscape-2026','cybersecurity-singapore-market-size-2026',
  'cybersecurity-singapore-regulatory-framework-2026','wellness-thailand-competitive-landscape-2026',
  'wellness-thailand-market-size-2026','wellness-thailand-medical-tourism-integration-2026',
  'rice-thailand-export-competitive-position-2026','rice-thailand-market-size-2026',
  'rice-thailand-premium-segment-strategy-2026','bpo-philippines-ai-impact-2026',
  'bpo-philippines-competitive-landscape-2026','bpo-philippines-market-size-2026',
  'palm-oil-indonesia-export-dynamics-2026','palm-oil-indonesia-market-size-2026',
  'palm-oil-indonesia-sustainability-mandate-2026','renewable-energy-indonesia-competitive-landscape-2026',
  'renewable-energy-indonesia-market-size-2026','renewable-energy-indonesia-policy-framework-2026',
  'digital-banking-indonesia-competitive-landscape-2026',
  // AEO entity articles added 2026-06-09
  'southeast-asia-market-research-guide-2026',
  'vietnam-fintech-data-2026',
  'kira-research-methodology-2026',
];

const REPORT_URLS  = REPORT_SLUGS.flatMap(s => [
  `https://kiraresearch.com/en/reports/${s}`,
  `https://kiraresearch.com/ja/reports/${s}`,
  `https://kiraresearch.com/ko/reports/${s}`,
]);
const INSIGHT_URLS = INSIGHT_SLUGS.map(s => `https://kiraresearch.com/en/insights/${s}`);

const ALL_URLS = [...new Set([...CORE, ...REPORT_URLS, ...INSIGHT_URLS])];

// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  let auth;
  try {
    auth = new google.auth.GoogleAuth({
      keyFile: SA_KEY_PATH,
      scopes:  ['https://www.googleapis.com/auth/indexing'],
    });
  } catch (e) {
    console.error('❌  Cannot load service account key:', SA_KEY_PATH);
    console.error('   Follow the SETUP instructions at the top of this file.');
    process.exit(1);
  }

  const client   = await auth.getClient();
  const indexing = google.indexing({ version: 'v3', auth: client });

  const toSubmit = ALL_URLS.slice(0, DAILY_QUOTA);
  if (ALL_URLS.length > DAILY_QUOTA) {
    console.warn(`⚠️  ${ALL_URLS.length} URLs total — submitting first ${DAILY_QUOTA} today (daily quota). Re-run tomorrow for the rest.`);
  }
  console.log(`\n📤  Submitting ${toSubmit.length} URLs to Google Indexing API…\n`);

  const results = { success: [], failed: [] };
  const BATCH = 10;

  for (let i = 0; i < toSubmit.length; i += BATCH) {
    const chunk = toSubmit.slice(i, i + BATCH);
    await Promise.all(chunk.map(async url => {
      try {
        await indexing.urlNotifications.publish({
          requestBody: { url, type: 'URL_UPDATED' },
        });
        process.stdout.write('.');
        results.success.push(url);
      } catch (err) {
        const msg = err?.errors?.[0]?.message || err?.message || String(err);
        process.stdout.write('✗');
        results.failed.push({ url, error: msg });
      }
    }));
    if (i + BATCH < toSubmit.length) await new Promise(r => setTimeout(r, DELAY_MS));
  }

  console.log(`\n\n── Result ─────────────────────────────────`);
  console.log(`  ✅  Success : ${results.success.length}`);
  console.log(`  ❌  Failed  : ${results.failed.length}`);

  if (results.failed.length) {
    console.log('\nFailed:');
    results.failed.forEach(f => console.log(`  ${f.url}\n    → ${f.error}`));
  }

  if (ALL_URLS.length > DAILY_QUOTA) {
    console.log(`\n💡  Remaining ${ALL_URLS.length - DAILY_QUOTA} URLs queued — re-run tomorrow.`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
