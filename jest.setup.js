/** @format */

require('@testing-library/jest-dom');

const nodeCrypto = require('crypto');

if (!global.crypto) {
  global.crypto = {};
}
if (typeof global.crypto.randomUUID !== 'function') {
  global.crypto.randomUUID = () => nodeCrypto.randomUUID();
}

// Radix (shadcn version) measures its popover anchor with ResizeObserver,
// which jsdom doesn't implement.
if (typeof global.ResizeObserver !== 'function') {
  global.ResizeObserver = function ResizeObserver() {
    return { observe() {}, unobserve() {}, disconnect() {} };
  };
}
