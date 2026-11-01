import '@testing-library/jest-dom/vitest';
import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, expect } from 'vitest';
import * as axeMatchers from 'vitest-axe/matchers';
import type { AxeMatchers } from 'vitest-axe/matchers';
import { installFakeChrome, resetFakeChrome } from './helpers/fakeChrome';

expect.extend(axeMatchers);

installFakeChrome();
beforeEach(() => {
  resetFakeChrome();
});
// Testing Library only registers its own cleanup when test globals are on, and they are off here.
afterEach(() => {
  cleanup();
});

// jest-dom 7 and vitest-axe 0.1 augment Vitest's old `Assertion<T>` shape; Vitest 5 reads custom
// matcher types from `Matchers<R, T>` instead, so register them there.
declare module 'vitest' {
  // Type parameters must match Vitest's declaration exactly for the interfaces to merge.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- declaration merge only
  interface Matchers<R extends void | Promise<void> = void | Promise<void>, T = unknown>
    extends TestingLibraryMatchers<unknown, R>, AxeMatchers {}
}
