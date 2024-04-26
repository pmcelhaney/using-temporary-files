# using-temporary-files

## 2.2.1

### Patch Changes

- b6b3e9c: forgot to build the package in CI

## 2.2.0

### Minor Changes

- 4ad230d: converted to TypeScript

## 2.1.1

### Patch Changes

- 051800e: retry deleting the temp directory if it failed due to a race condition

## 2.1.0

### Minor Changes

- 26a21d8: added a read() function

## 2.0.0

### Major Changes

- 508959c: Removed the first arguments of both usingTemporaryFiles() and its callback. Turns out neither of them where necessary. We can get the same functionality using path() and add() respectively.
