# 🌳🥤 tiny-treeshaker

A really ~bad~ tiny tree shaker (experimental)

### Why?

This is a bare-bones tree shaking codemod that can be adapted for targeting specific use cases.

(I made this cos i'm writing a seperate codemod for a migration I'm working on. The migration removes callsites to a bunch of random helper functions - which now eslint complains about, and I need to remove. Hence this tree shaking codemod.)

Existing solutions are very fancy pants and try and target everything and require complex setups. I want to only target a known set
of things to tree shake away. (allowlist vs denylist).

The goal of this is to be:
- small as possible (while still being "correct". This won't shake away things you use, but may not shake away everything you don't use.)
- simple to understand / extend / chop and change as needed

### Work in progress

This doesn't shake _everything_ away just yet (sorry!), but gets most of the common cases (i.e. enough to be used when targeting a specific thing)

### What you should probably use instead

- https://github.com/coderaiser/putout
- https://github.com/smeijer/unimported
