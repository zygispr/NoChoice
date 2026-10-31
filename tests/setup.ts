import '@testing-library/jest-dom/vitest';
import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers';
import { expect } from 'vitest';
import * as axeMatchers from 'vitest-axe/matchers';
import type { AxeMatchers } from 'vitest-axe/matchers';

expect.extend(axeMatchers);

// jest-dom 7 and vitest-axe 0.1 augment Vitest's old `Assertion<T>` shape; Vitest 5 reads custom
// matcher types from `Matchers<R, T>` instead, so register them there.
declare module 'vitest' {
  // Type parameters must match Vitest's declaration exactly for the interfaces to merge.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-object-type -- declaration merge only
  interface Matchers<R extends void | Promise<void> = void | Promise<void>, T = unknown>
    extends TestingLibraryMatchers<unknown, R>, AxeMatchers {}
}
