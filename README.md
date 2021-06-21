# 🌳🥤 tiny-treeshaker

A really ~bad~ tiny tree shaker (experimental)

### Why?

I want to use this in combination with other codemods when refactoring code.

Existing solutions try and target everything - I want to only target a known set
of things to tree shake away. (allowlist vs denylist).

The goal of this is to be:
- small as possible (whilst still being "correct")
- simple to understand / extend / chop and change as needed

### Work in progress

This doesn't shake _everything_ away just yet, but gets most of the common cases (i.e. enough to be used when targeting a specific thing)

### What you should probably use instead

- https://github.com/coderaiser/putout
- https://github.com/smeijer/unimported
