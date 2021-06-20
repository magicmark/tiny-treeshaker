# bad-treeshaker

A really bad tree shaker (experimental)

### Why?

I want to use this in combination with other codemods when refactoring code.

Existing solutions try and target everything - I want to only target a known set
of things to tree shake away. (allowlist vs denylist).

The goal of this is to be as small (whilst still being "correct") as possible, so
as to be as simple to extend and chop and change as possible.

### What you should probably use instead

- https://github.com/coderaiser/putout
- https://github.com/smeijer/unimported
