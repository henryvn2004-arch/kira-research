// ============================================================
// KIRA RESEARCH — api/studio-report.js
// Read API for completed studio_reports rows.
//
//   GET  /api/studio-report?id=<uuid>
//   Authorization: Bearer <supabase-jwt>
//   → {
//       id, title, eyebrow, preview, country, industry, year,
//       toc, full_content, pages, created_at,
//       html_url, pdf_url       (short-lived signed URLs)
//     }
//
//   GET  /api/studio-report               (no id)
//   → { reports: [user's last 50] }       — list view for the My Library page
//
//   DELETE /api/studio-report?id=<uuid>   — soft-archive (is_archived=true)
//
// Service-key reads bypass RLS; we still gate on user_id = caller's id.
// ============================================================

import {
  sb, verifyBearer, cors, signStorageUrl,
  STUDIO_REPORTS_BUCKET
} from './_lib/studio-shared.js';

export default async function handler(req, res) {
  cors(res, 'GET,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  const user = await verifyBearer(req);
  if (!user) { res.status(401).json({ error: 'unauthenticated' }); return; }

  const url = new URL(req.url, `https://${req.headers.host || 'x'}`);
  const id  = url.searchParams.get('id');

  try {
    // ── DELETE — soft-archive ────────────────────────────────
    if (req.method === 'DELETE') {
      if (!id) { res.status(400).json({ error: 'id_required' }); return; }
      // We scope by user_id so a logged-in user can't archive someone else's row.
      const updated = await sb(
        `studio_reports?id=eq.${id}&user_id=eq.${user.id}`,
        'PATCH',
        { is_archived: true, archived_at: new Date().toISOString() }
      );
      const row = Array.isArray(updated) ? updated[0] : updated;
      if (!row) { res.status(404).json({ error: 'not_found' }); return; }
      res.status(200).json({ ok: true });
      return;
    }

    if (req.method !== 'GET') {
      res.status(405).json({ error: 'method_not_allowed' });
      return;
    }

    // ── GET single ───────────────────────────────────────────
    if (id) {
      const rows = await sb(
        `studio_reports?id=eq.${id}&user_id=eq.${user.id}&is_archived=eq.false` +
        `&select=*&limit=1`
      );
      const r = Array.isArray(rows) ? rows[0] : null;
      if (!r) { res.status(404).json({ error: 'not_found' }); return; }

      const [htmlUrl, pdfUrl] = await Promise.all([
        signStorageUrl(STUDIO_REPORTS_BUCKET, r.html_path),
        signStorageUrl(STUDIO_REPORTS_BUCKET, r.pdf_path)
      ]);

      res.status(200).json({
        id:           r.id,
        title:        r.title,
        eyebrow:      r.eyebrow,
        preview:      r.preview,
        country:      r.country,
        industry:     r.industry,
        year:         r.year,
        toc:          r.toc,
        full_content: r.full_content,
        pages:        r.pages,
        created_at:   r.created_at,
        html_url:     htmlUrl,
        pdf_url:      pdfUrl
      });
      return;
    }

    // ── GET list (My Studio Library) ─────────────────────────
    const rows = await sb(
      `studio_reports?user_id=eq.${user.id}&is_archived=eq.false` +
      `&order=created_at.desc&limit=50` +
      `&select=id,title,eyebrow,country,industry,year,pages,created_at`
    );
    res.status(200).json({ reports: rows || [] });
  } catch (err) {
    console.error('[studio-report] error:', err.message);
    res.status(500).json({ error: 'server_error' });
  }
}
