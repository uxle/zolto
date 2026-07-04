/**
 * Zolto unit — deepClone()
 */
import { deepClone } from '../../../js/utils/deep-clone.js';

const orig = { a: 1, b: [2, 3], c: { d: 'hello' } };
const clone = deepClone(orig);
console.assert(clone !== orig,       'deepClone: different reference');
console.assert(clone.a === 1,        'deepClone: scalar');
console.assert(clone.b !== orig.b,   'deepClone: nested array is new');
console.assert(clone.c !== orig.c,   'deepClone: nested object is new');
console.assert(clone.c.d === 'hello','deepClone: nested value');

console.log('deep-clone unit tests: all passed');
