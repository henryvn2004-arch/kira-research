#!/usr/bin/env node
// ---------------------------------------------------------------
// scripts/fetch-market-data.mjs — Kira Data, Sprint D3
//
//   node scripts/fetch-market-data.mjs <queue-id> > <scratch>/market_data.json
//
// Prints the "Market data" the site shows for this topic (api/market-data.js): macro tiles, Japan's direct
// investment, visitor arrivals and partner-reported trade for the segment's HS codes, each with its source.
// Same numbers as the report page panel, so the report and the page agree. Prints nothing (empty file) and
// exits 0 when there is no topic, no data or Supabase is unreachable.
// ---------------------------------------------------------------

import handler from '../../../api/market-data.js';

const [, , id] = process.argv;
if (!id || !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) process.exit(0);

await new Promise((done) => {
  const res = {
    setHeader() {},
    status(code) { this.code = code; return this; },
    json(body) {
      if (this.code === 200 && (body.macro.length || body.trade.length)) process.stdout.write(JSON.stringify(body, null, 1) + '\n');
      done();
    }
  };
  handler({ method: 'GET', query: { topic: id } }, res).catch(() => done());
});
