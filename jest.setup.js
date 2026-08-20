/** @format */

require('@testing-library/jest-dom');

const nodeCrypto = require('crypto');

if (!global.crypto) {
  global.crypto = {};
}
if (typeof global.crypto.randomUUID !== 'function') {
  global.crypto.randomUUID = () => nodeCrypto.randomUUID();
}
