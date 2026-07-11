import '@testing-library/jest-dom';
import { toHaveNoViolations } from 'jest-axe';
import { TextDecoder, TextEncoder } from 'node:util';

Object.assign(globalThis, { TextDecoder, TextEncoder });

expect.extend(toHaveNoViolations);
