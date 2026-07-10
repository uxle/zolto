/**
 * Zolto unit — debounce()
 */
import { debounce } from '../../../js/utils/debounce.js';

let count = 0;
const fn = debounce(() => count++, 50);

fn(); fn(); fn();
console.assert(count === 0, 'debounce: should not have fired yet');
await new Promise(r => setTimeout(r, 100));
console.assert(count === 1, 'debounce: should fire exactly once');

console.log('debounce unit tests: all passed');
