# using-temporary-files

## 2.1.1

### Patch Changes

- 051800e: retry deleting the temp directory if it failed due to a race condition

## 2.1.0

### Minor Changes

- 26a21d8: added a read() function

## 2.0.0

### Major Changes

- 508959c: Removed the first arguments of both usingTemporaryFiles() and its callback. Turns out neither of them where necessary. We can get the same functionality using path() and add() respectively.
