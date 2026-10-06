# using-temporary-files accessibility

## Scope

This statement covers the package's JavaScript and TypeScript APIs and the documentation in this repository.
using-temporary-files is a library for creating and disposing of file-system fixtures in tests, with no graphical user interface of its own.
It does not assess the accessibility of applications tested with the library, or the editors, test runners, terminals, and documentation viewers used with it.

## Current support

- The [README](README.md) explains setup, file operations, resource lifetimes, and cleanup with written descriptions and copyable code examples.
- The package supplies TypeScript declarations for its operations and disposal APIs.
- `temporaryFiles()` exposes `asyncDispose()` and `dispose()` as well as symbol-based disposal methods.
  The README describes calling `asyncDispose()` in a `finally` block when `using` syntax is unavailable in the runtime.
- The deprecated callback API remains documented in [Deprecated callback API](docs/deprecated-api.md).

These are available documentation and API features, not a certification of editor or assistive-technology support.

## Limitations and verification gaps

This statement does not establish WCAG conformance or certify any screen-reader, editor, or documentation-viewer combination.
Screen-reader navigation of code examples and the usability of the documentation with magnification or other assistive technology have not been evaluated as part of preparing this statement.
Examples require familiarity with JavaScript, asynchronous code, and file-system paths.
The package's unit tests and executable Markdown examples check code behavior; they do not measure accessibility of the documentation or development environment.

## Report a barrier

Please [open an issue in the using-temporary-files issue tracker](https://github.com/pmcelhaney/using-temporary-files/issues/new) to report a barrier in the API or documentation.
If possible, include the affected API or documentation section, expected and actual behavior, steps to reproduce, and the package and Node.js versions.
Your editor, operating system, documentation viewer, and assistive technology may also help explain the problem; share only what you are comfortable making public.
Remove private file contents and sensitive paths from examples.
You do not need to identify a WCAG criterion or propose a fix.
This statement sets no response-time or remediation deadline.
