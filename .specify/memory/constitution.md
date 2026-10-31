# NoChoice Constitution

## Core Principles

### I. Code Quality & Readability

Code is written for the next person who reads it, not for the compiler.

- Names MUST describe intent (what and why), not mechanics; abbreviations are allowed only
  when they are standard in the domain.
- Each function, module, and component MUST have a single, clearly stated responsibility.
  A unit that needs "and" to describe what it does SHOULD be split.
- Code MUST pass the project's formatter, linter, and type checker with zero errors before
  merge. Warnings MUST NOT be suppressed without an inline justification.
- Comments MUST explain *why* (constraints, trade-offs, non-obvious decisions); code that
  needs a comment to explain *what* it does SHOULD be rewritten instead.
- Dead code, commented-out code, and unexplained `TODO`s MUST NOT be merged. A `TODO` MUST
  reference a tracked issue.
- Errors MUST be handled explicitly at the boundary where they can be acted on; silently
  swallowed errors are forbidden.

**Rationale**: Code is read far more often than it is written. Readable, consistent code
lowers the cost of every future change, review, and bug fix.

### II. Simplicity Over Complexity

The simplest solution that meets today's requirements wins.

- Features MUST be built for current, specified requirements (YAGNI). Speculative
  extension points, configuration, or generality MUST NOT be added "just in case".
- New dependencies, frameworks, services, or architectural layers MUST be justified in the
  feature plan by a concrete need that the existing stack cannot meet reasonably.
- Abstractions MUST be introduced only after a pattern repeats (rule of three) or when they
  clearly reduce total complexity; premature abstraction is treated as a defect.
- Any deviation from the simplest approach MUST be recorded in the plan's
  Complexity Tracking table with the simpler alternative and why it was rejected.
- Prefer standard library and platform features over custom solutions.

**Rationale**: Every line, dependency, and layer is a long-term maintenance cost.
Complexity is easy to add and expensive to remove.

### III. Testing Discipline (NON-NEGOTIABLE)

Untested code is unfinished code.

- Test-first is the default: for each behavior, a failing test MUST be written and observed
  to fail before the implementation that makes it pass (Red → Green → Refactor).
- Every user story MUST have at least one automated acceptance test that exercises it
  end-to-end through its public interface.
- Business logic MUST have unit tests; boundaries between components, services, or external
  systems MUST have integration or contract tests.
- Every bug fix MUST include a regression test that fails without the fix.
- Tests MUST be deterministic, isolated, and fast enough to run on every change; flaky tests
  MUST be fixed or quarantined with a tracked issue within one working day.
- The full test suite MUST pass in CI before merge. Coverage is a signal, not a goal: new
  and changed code SHOULD meet ≥ 80% line coverage, and critical paths MUST be covered.

**Rationale**: Tests are the executable specification. They make refactoring safe, keep
simplicity achievable, and prevent regressions from reaching users.

### IV. Great User Experience

Every feature is judged by how it feels to the person using it.

- User-facing behavior MUST be defined from the user's perspective in the spec, with
  acceptance scenarios covering the primary flow, empty states, loading states, and errors.
- Interfaces MUST be consistent: the same action, term, or pattern MUST look and behave the
  same everywhere in the product.
- Every user action MUST give immediate feedback; operations longer than ~1 second MUST show
  progress, and failures MUST show a clear, human-readable message with a way forward.
  Raw stack traces or internal error codes MUST NOT be shown to users.
- User-facing interfaces MUST meet WCAG 2.2 AA accessibility guidelines (keyboard
  navigation, sufficient contrast, semantic structure, screen-reader labels).
- User data and in-progress work MUST NOT be lost due to errors, navigation, or reloads
  where it can be reasonably preserved.

**Rationale**: Users experience the product, not the code. Consistency, clarity, and
feedback build trust; accessibility ensures the product works for everyone.

### V. Performance by Design

Performance is a requirement, not an afterthought.

- Each feature plan MUST state measurable performance goals (latency, throughput, resource
  use) appropriate to its scope, defaulting to the budgets in *Quality Standards & Budgets*.
- Performance-critical paths MUST be covered by automated benchmarks or performance tests;
  a regression beyond 10% of the agreed budget MUST block merge until resolved or the
  budget is formally revised.
- Optimizations MUST be driven by measurement (profiling, metrics), not guesswork, and MUST
  NOT sacrifice readability without a documented, measured benefit.
- Known anti-patterns MUST be avoided by default: N+1 queries, unbounded loops over remote
  calls, unpaginated collections, blocking I/O on interactive paths, and unbounded caches.

**Rationale**: Speed is part of user experience. Budgets set up front are cheap to meet;
performance retrofitted later is expensive and risky.

### VI. Scalability in Mind

Design so growth requires configuration and capacity, not rewrites — without building for
scale that is not yet needed (see Principle II).

- Components SHOULD be stateless where practical; state MUST live in explicitly designated
  stores, not in process memory that prevents horizontal scaling.
- All collections exposed through APIs or UI MUST be paginated or bounded; all external
  calls MUST have timeouts, and retries MUST use backoff.
- Data models and APIs MUST be designed so that expected 10× growth in users or data does
  not require a breaking change; plans MUST state expected scale assumptions.
- Public interfaces and data schemas MUST be versioned; breaking changes MUST include a
  migration path.
- Systems MUST emit structured logs and key metrics sufficient to detect capacity and
  performance problems before users report them.

**Rationale**: Clear boundaries, bounded work, and observability let the system grow
gracefully. Scalability is a design property, not a premature infrastructure investment.

## Quality Standards & Budgets

These defaults apply unless a feature plan sets stricter, documented targets.

- **Static quality**: zero formatter, linter, and type-checker errors on the main branch.
- **Testing**: all tests green in CI; new/changed code ≥ 80% line coverage; no known flaky
  tests without a tracked issue.
- **Interactive response**: user-perceived feedback within 100 ms of any input; primary
  views usable within 2 seconds on a typical connection and device.
- **Server/API latency**: p95 ≤ 200 ms for standard reads, p95 ≤ 500 ms for standard
  writes, measured under expected load.
- **Accessibility**: WCAG 2.2 AA for all user-facing interfaces.
- **Dependencies**: every new dependency is justified in the plan, actively maintained,
  and free of known high or critical vulnerabilities.
- **Security baseline**: secrets MUST NOT be committed; all external input MUST be
  validated at system boundaries.

## Development Workflow & Quality Gates

- **Spec before code**: work follows the Spec Kit flow — specify → clarify (as needed) →
  plan → tasks → implement. Implementation MUST NOT begin without an approved spec and plan.
- **Constitution Check**: every plan MUST pass a Constitution Check against Principles
  I–VI before design and again after design. Violations MUST be justified in Complexity
  Tracking or the design MUST change.
- **Task ordering**: test tasks MUST precede the implementation tasks they verify.
- **Small, focused changes**: changes SHOULD be small enough to review in one sitting and
  MUST address a single concern.
- **Code review**: every change MUST be reviewed before merge. Reviewers MUST verify
  readability, simplicity, test coverage, UX acceptance criteria, and performance budgets.
- **Merge gate**: a change merges only when CI is green (build, lint, type check, tests,
  performance checks where defined) and review is approved.
- **Definition of done**: acceptance scenarios pass, documentation for changed behavior is
  updated, and no constitution violations remain unjustified.

## Governance

- This constitution supersedes all other development practices and conventions for the
  NoChoice project. Where guidance conflicts, this document wins.
- **Amendments** MUST be proposed as a change to this file that states the motivation,
  the exact text change, and the impact on existing specs, plans, and code. Amendments
  take effect once reviewed and merged; any required migration MUST be planned in the same
  change or tracked as follow-up work.
- **Versioning** follows semantic versioning:
  - MAJOR — a principle or governance rule is removed or redefined incompatibly.
  - MINOR — a principle or section is added, or guidance is materially expanded.
  - PATCH — clarifications, wording, or typo fixes with no change in meaning.
- **Compliance review**: every plan's Constitution Check and every code review MUST verify
  compliance. Any added complexity MUST be justified in writing. Non-compliance found after
  merge MUST be tracked and fixed with the same priority as a defect.
- Runtime development guidance for agents lives in `CLAUDE.md` (when present) and MUST NOT
  contradict this constitution.

**Version**: 1.0.0 | **Ratified**: 2026-10-31 | **Last Amended**: 2026-10-31
