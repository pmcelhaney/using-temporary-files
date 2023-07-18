# using-temporary-files

## 2.0.0

### Major Changes

- c1fb8d7: Simplified the API. Removed the first argument (files) and the first argument to callbacks (directory), as neither is strictly necessary.
- 508959c: Removed the first arguments of both usingTemporaryFiles() and its callback. Turns out neither of them where necessary. We can get the same functionality using path() and add() respectively.
