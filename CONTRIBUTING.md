# Contributing

1. Use Node `^24.15.0 || >=26` and the pnpm version in `package.json`.
2. Build the sibling `vibeform` and `vibequery` repositories, then run `node scripts/bootstrap.ts`
   and `pnpm install`.
3. Run `pnpm check` (and `pnpm verify` for the full suite) before opening a pull request.
4. Add a changeset with `pnpm changeset` for every user-visible change.
5. Write commit messages as [Conventional Commits](https://www.conventionalcommits.org/).
