// ============================================================
// Company Intelligence — pipeline constants
// ============================================================

export const PIPELINE_VERSION = 1;

// Cache TTL in days per source type (0 = no cache / realtime)
export const SOURCE_TTL_DAYS = {
  dkkd:           30,
  tax:             7,
  noip:           30,
  court:          30,
  bidding:        30,
  gmb:             7,
  shopee:          3,
  facebook:        3,
  website:         7,
  news:            0,
  foreign_filing: 90,
};

// Entity resolution confidence thresholds
export const MATCH_CONF = {
  MST_DIRECT:   1.0,   // MST appears directly in source (footer, invoice, shop info)
  PHONE:        0.9,   // Matching phone number
  NAME_ADDRESS: 0.75,  // Matching normalised name + address
  NAME_ONLY:    0.4,   // Name only — too weak to auto-link
  AUTO_LINK_MIN: 0.75, // Must reach this to auto-link; below → skip/candidate only
};

// Graph traversal limits
export const GRAPH_MAX_DEPTH = 2;
export const GRAPH_MAX_NODES = 30;
export const GRAPH_MIN_CONF  = 0.3;  // Prune edges below this path-confidence

// Source types that all connectors must recognise
export const SOURCE_TYPES = [
  'dkkd', 'tax', 'noip', 'court', 'bidding',
  'gmb', 'shopee', 'facebook', 'website', 'news', 'foreign_filing',
];

// Relationship types (edge labels in the entity graph)
export const REL_TYPES = [
  'owns_trademark',
  'operates_brand',
  'shares_legal_rep',
  'shares_address',
  'shareholder_of',
  'subsidiary_of',
  'branch_of',
  'legal_rep_of',
  'mentioned_with',
];
