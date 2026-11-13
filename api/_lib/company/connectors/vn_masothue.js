// ============================================================
// VN masothue.com connector — scrapes charter_capital + founding_date
//
// Source: https://masothue.com/{mst}
// Requires: FIRECRAWL_API_KEY env var.
// Returns facts: charter_capital, founding_date, founding_year, address, legal_rep
//
// The VietQR ĐKKD connector already covers address/status at confidence=1.0.
// This connector adds the two facts VietQR doesn't provide:
//   charter_capital (VND), founding_date (ISO date string)
// Both are stored at confidence=0.85 (scrape, not official registry API).
// ============================================================

import { emptyResult, failedResult } from '../connector.js';

const FIRECRAWL_BASE = 'https://api.firecrawl.dev/v1';

export async function fetch(entity, _ctx) {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) return failedResult('no_firecrawl_key');
  if (!entity.tax_id) return failedResult('no_tax_id');

  const targetUrl = `https://masothue.com/${entity.tax_id}`;

  let markdown;
  try {
    const res = await globalThis.fetch(`${FIRECRAWL_BASE}/scrape`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: targetUrl,
        formats: ['markdown'],
        onlyMainContent: true,
        timeout: 15000,
      }),
      signal: AbortSignal.timeout(20000),
    });

    if (res.status === 404) return emptyResult('page_not_found');
    if (!res.ok) return failedResult(`firecrawl_http_${res.status}`);

    const json = await res.json();
    if (!json.success || !json.data?.markdown) return emptyResult('empty_response');
    markdown = json.data.markdown;
  } catch (err) {
    if (err.name === 'TimeoutError') return failedResult('timeout');
    return failedResult(`fetch_error: ${err.message}`);
  }

  const facts = [];
  const now = new Date().toISOString();

  // Charter capital — masothue.com shows "84.000.000.000 đồng" or "84,000,000,000"
  // The label appears as "Vốn điều lệ" in Vietnamese.
  const capMatch = markdown.match(
    /[Vv]ốn\s+[Đđ]iều\s+[Ll]ệ\s*[:\|]?\s*([\d.,]+)\s*(đồng|VNĐ|VND)?/i
  );
  if (capMatch) {
    // Remove thousand separators (both . and ,), keep only digits
    const raw = capMatch[1].replace(/[.,]/g, '');
    const num = parseInt(raw, 10);
    if (!isNaN(num) && num > 0 && num < 1e16) {
      facts.push({ key: 'charter_capital', value: num, confidence: 0.85, observed_at: now });
    }
  }

  // Registration / founding date — "Ngày cấp" or "Ngày đăng ký" or "Ngày thành lập"
  const dateMatch = markdown.match(
    /(?:[Nn]gày\s+[Cc]ấp|[Nn]gày\s+[Đđ][ăa]ng\s+[Kk]ý|[Nn]gày\s+[Tt]hành\s+[Ll]ập)\s*[:\|]?\s*(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/i
  );
  if (dateMatch) {
    const [, d, m, y] = dateMatch;
    const isoDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    const year = parseInt(y, 10);
    if (year >= 1945 && year <= new Date().getFullYear()) {
      facts.push({ key: 'founding_date', value: isoDate, confidence: 0.85, observed_at: now });
      // Only override founding_year if not already seeded at higher confidence
      facts.push({ key: 'founding_year', value: year, confidence: 0.85, observed_at: now });
    }
  }

  // Legal representative — "Đại diện pháp luật"
  const repMatch = markdown.match(
    /[Đđ]ại\s+[Dd]iện\s+[Pp]háp\s+[Ll]uật\s*[:\|]?\s*([^\n\|]{3,80})/i
  );
  if (repMatch) {
    const repName = repMatch[1].trim().replace(/\s+/g, ' ');
    if (repName.length >= 3 && repName.length <= 80) {
      facts.push({ key: 'legal_rep', value: repName, confidence: 0.85, observed_at: now });
    }
  }

  // Status — "Trạng thái"
  let statusCanonical = null;
  const statusMatch = markdown.match(/[Tt]rạng\s+[Tt]hái\s*[:\|]?\s*([^\n\|]{3,60})/i);
  if (statusMatch) {
    const raw = statusMatch[1].toLowerCase().trim();
    if (raw.includes('hoạt động')) statusCanonical = 'active';
    else if (raw.includes('tạm ngừng')) statusCanonical = 'suspended';
    else if (raw.includes('giải thể') || raw.includes('phá sản') || raw.includes('đóng cửa')) {
      statusCanonical = 'dissolved';
    }
    facts.push({ key: 'legal_status_raw', value: statusMatch[1].trim(), confidence: 0.85, observed_at: now });
  }

  return {
    facts,
    edges: [],
    raw: { url: targetUrl, markdown_length: markdown.length },
    coverage_status: facts.length > 0 ? 'found' : 'checked_empty',
    status_canonical: statusCanonical,
  };
}
