// ============================================================
// KIRA RESEARCH — api/_lib/list-source.js
// Adapter to the BizDirect partner build API that produces the paid Excel list of a market map
// (company-level phone and email, no named persons). That API does not exist yet, so this stub throws and
// api/_lib/lists.js records the purchase as build_status 'pending' (paid, file not ready).
//
//   buildList({ slug, orderId, nCompanies }) -> { bytes: Buffer, filename: string }
// The real version calls the partner API with the map's segment definition and the order id (for the
// per-order decoy step), and returns the .xlsx bytes. The file never touches the repo or the database.
// ============================================================
export async function buildList(_args) {
  throw new Error('list source not available yet');
}
