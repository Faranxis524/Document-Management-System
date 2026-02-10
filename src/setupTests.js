// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// jsPDF (and its image helpers) rely on TextEncoder/TextDecoder which may be missing
// in the Jest environment depending on Node version.
// Polyfill them so importing App.js doesn't crash during tests.
// eslint-disable-next-line no-undef
if (typeof TextEncoder === 'undefined' || typeof TextDecoder === 'undefined') {
  // eslint-disable-next-line global-require
  const util = require('util');
  // eslint-disable-next-line no-global-assign
  global.TextEncoder = util.TextEncoder;
  // eslint-disable-next-line no-global-assign
  global.TextDecoder = util.TextDecoder;
}
