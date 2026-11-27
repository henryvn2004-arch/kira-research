-- 082: the price recompute functions (079) are for the server only (admin "Recompute prices"); they were created
-- with the default PUBLIC execute grant, so anon/authenticated could call them through /rest/v1/rpc.
-- Idempotent. Apply by hand (MCP or dashboard).
revoke execute on function recompute_report_prices() from public, anon, authenticated;
revoke execute on function recompute_transcript_prices() from public, anon, authenticated;
grant  execute on function recompute_report_prices() to service_role;
grant  execute on function recompute_transcript_prices() to service_role;
