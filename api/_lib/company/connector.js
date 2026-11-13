// ============================================================
// Company Intelligence — Connector interface
//
// Every data source connector must export a `fetch` function
// matching this signature. Connectors are stateless; they
// receive an entity and return structured output.
//
// Convention: create one file per source type under
// api/_lib/company/connectors/<source_type>.js
// ============================================================

/**
 * @typedef {Object} Entity
 * @property {string}  id
 * @property {string}  type             - 'company'|'brand'|'person'|'address'|'foreign_org'
 * @property {string}  [mst]
 * @property {string}  canonical_name
 * @property {string}  name_norm
 */

/**
 * @typedef {Object} FactDraft
 * @property {string}  key              - e.g. 'charter_capital', 'founding_date', 'industry'
 * @property {*}       value            - serialisable value (string | number | boolean | object)
 * @property {number}  confidence       - 0..1
 * @property {string}  [observed_at]    - ISO timestamp when the source observed this fact
 */

/**
 * @typedef {Object} EdgeDraft
 * @property {string}  src_entity_id
 * @property {string}  [dst_entity_id]  - set if target entity already exists in DB
 * @property {string}  [dst_mst]        - set to trigger lookup/creation of target by MST
 * @property {string}  [dst_name]       - set to trigger lookup/creation of target by name
 * @property {string}  type             - one of REL_TYPES in config.js
 * @property {number}  [percent]        - ownership percentage if applicable
 * @property {number}  confidence       - 0..1
 * @property {string}  [observed_at]    - ISO timestamp
 */

/**
 * @typedef {Object} ConnectorResult
 * @property {FactDraft[]}                     facts
 * @property {EdgeDraft[]}                     edges
 * @property {*}                               raw            - raw payload for raw_documents cache
 * @property {'found'|'checked_empty'|'failed'} coverage_status
 * @property {string}                          [error]        - human-readable if coverage_status='failed'
 */

/**
 * Base fetch — must be overridden by every connector.
 * Calling this directly throws so missing implementations are caught at runtime.
 *
 * @param {Entity}                                                    _entity
 * @param {{ supabase: import('@supabase/supabase-js').SupabaseClient }} _ctx
 * @returns {Promise<ConnectorResult>}
 */
export async function fetch(_entity, _ctx) {
  throw new Error('Connector.fetch() not implemented');
}

/**
 * Helper: build a minimal ConnectorResult for an empty response.
 *
 * @param {string} [reason]
 * @returns {ConnectorResult}
 */
export function emptyResult(reason) {
  return {
    facts: [],
    edges: [],
    raw: null,
    coverage_status: 'checked_empty',
    error: reason,
  };
}

/**
 * Helper: build a failed ConnectorResult.
 *
 * @param {string} error
 * @returns {ConnectorResult}
 */
export function failedResult(error) {
  return {
    facts: [],
    edges: [],
    raw: null,
    coverage_status: 'failed',
    error,
  };
}
