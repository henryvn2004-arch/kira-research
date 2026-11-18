// node tests/brand-match.test.mjs — unit tests of the brand matcher (no network).
import assert from 'node:assert/strict';
import { buildPatterns, countMentions, isMention } from '../api/_lib/brand-match.js';

const hit = (names, text, opts) => isMention(countMentions(text, buildPatterns(names, opts)), Boolean(opts && opts.strict));

// Word boundaries for Latin names
assert.equal(hit(['Toto'], 'Total demand rose.'), false);
assert.equal(hit(['Toto'], 'Toto and Lixil lead sanitaryware.'), true);
assert.equal(hit(['Toto'], 'Sales at TOTO Ltd.'), true);
assert.equal(hit(['Apple'], 'We grew pineapple.'), false);
assert.equal(hit(['Daikin'], "Daikin's share is 20%"), true);
assert.equal(hit(['Canon'], 'the canonical view'), false);
assert.equal(hit(['Mitsubishi Electric'], 'Mitsubishi  Electric sells ACs'), true);
assert.equal(hit(['Coca-Cola'], 'Coca Cola and Coca-Cola'), true);
// Latin name glued to CJK text still matches
assert.equal(hit(['Panasonic'], 'Panasonic製の冷蔵庫'), true);
// Aliases in other scripts
assert.equal(hit(['Panasonic', 'パナソニック', '國際牌'], 'パナソニックが首位'), true);
assert.equal(hit(['Panasonic', 'パナソニック', '國際牌'], '台灣的國際牌'), true);
// Strict (everyday word): exact case and 2+ mentions
assert.equal(hit(['Base'], 'the base case and the Base', { strict: true }), false);
assert.equal(hit(['Base'], 'Base posted gains. Base also expanded.', { strict: true }), false);
assert.equal(hit(['Base'], 'Base posted gains. '.repeat(5), { strict: true }), true);
assert.equal(hit(['Base'], 'the base case, the base rate', { strict: true }), false);
// Short Latin names are case-sensitive, 2 mentions
assert.equal(hit(['LG'], 'lg lg lg'), false);
assert.equal(hit(['LG'], 'LG and LG Chem'), true);
assert.equal(hit(['LG'], 'LG only once'), false);
// CJK: 2 chars need 2 mentions, 1 char ignored
assert.equal(hit(['豐田'], '豐田 leads'), false);
assert.equal(hit(['豐田'], '豐田 leads; 豐田 expands'), true);
assert.deepEqual(buildPatterns(['牌']).ignored, ['牌']);
assert.equal(hit(['X'], 'X'), false);
// Regex metacharacters in names are escaped
assert.equal(hit(['A.O. Smith'], 'A.O. Smith water heaters'), true);
assert.equal(hit(['A.O. Smith'], 'AxOx Smith'), false);
console.log('brand-match: all tests passed');
