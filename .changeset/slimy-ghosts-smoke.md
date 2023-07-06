---
"using-temporary-files": major
---

Removed the first arguments of both usingTemporaryFiles() and its callback. Turns out neither of them where necessary. We can get the same functionality using path() and add() respectively.
