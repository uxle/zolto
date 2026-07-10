/**
 * Zolto unit — Tokenizer class
 * Tests the Tokenizer class and utility functions from src/tokenizer.js.
 */
import { Tokenizer, slugify, uniqueSlug, parseCodeMeta, parseLineRanges } from '../../../src/tokenizer.js';

// slugify
console.assert(slugify('Hello World')     === 'hello-world',  'slugify basic');
console.assert(slugify('Héllo Wörld')     === 'hello-world',  'slugify unicode');
console.assert(slugify('  -- edge --  ')  === 'edge',         'slugify edge');

// uniqueSlug
const used = new Set();
console.assert(uniqueSlug('title', used) === 'title',         'uniqueSlug first');
console.assert(uniqueSlug('title', used) === 'title-1',       'uniqueSlug dup');
console.assert(uniqueSlug('title', used) === 'title-2',       'uniqueSlug dup2');

// parseLineRanges
const r = parseLineRanges('1,3-5,7');
console.assert(JSON.stringify(r) === JSON.stringify([1,3,4,5,7]), 'parseLineRanges');

// parseCodeMeta
const m = parseCodeMeta('title="app.js" {2,4} numbers');
console.assert(m.title === 'app.js',                'parseCodeMeta title');
console.assert(JSON.stringify(m.highlightLines) === '[2,4]', 'parseCodeMeta lines');
console.assert(m.lineNumbers === true,              'parseCodeMeta numbers');
console.assert(m.diff === false,                    'parseCodeMeta no diff');

// Tokenizer class
const tok = new Tokenizer('hello world');
console.assert(tok.ch() === 'h',   'Tokenizer ch()');
console.assert(tok.advance(5) === 'hello', 'Tokenizer advance()');
console.assert(tok.ch() === ' ',   'Tokenizer position after advance');

console.log('tokenizer unit tests: all passed');
