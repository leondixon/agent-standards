# Publishing to npm

The package is `@leondixon/agent-standards`, published under the **`leondixon`
npm organisation**. Scoped packages are **private by default**, so publishing needs
`--access public` the first time.

## One-time setup

1. Log in from the terminal:

   ```sh
   npm login
   ```

   Confirm which account you are on — note this is your personal username, which is
   *not* the same as the org scope:

   ```sh
   npm whoami
   ```

2. Confirm your account can publish to the org. You need the **Developer** role or
   higher on a team with write access to the package:

   ```sh
   npm org ls leondixon
   ```

   If your username is missing, add it from
   **npmjs.com → Organisations → leondixon → Members**.

3. Enable two-factor auth on the account (npm prompts for it on publish once set).
   For CI publishing, create an automation token instead:
   **npmjs.com → Access Tokens → Generate → Automation**. The token inherits the
   permissions of the account that created it, so that account also needs org
   write access.

## Before every publish

Check what will actually ship — the package deliberately excludes tests and
fixtures, so this is worth a glance:

```sh
npm pack --dry-run
```

Expect roughly 134 files and 54 KB. If a `.test.js` or `__fixtures__/` path
appears, the `files` patterns in `package.json` have regressed.

Verify it works as an installed package, not just from the clone:

```sh
npm pack
mkdir -p /tmp/verify && cd /tmp/verify
npm init -y >/dev/null
npm install ../path/to/leondixon-agent-standards-0.1.0.tgz
npx standards init .
```

`prepublishOnly` runs `build` and the test suite automatically, so a broken plugin
index or a failing test blocks the publish.

## First publish

```sh
npm publish --access public
```

Without `--access public` a scoped package publishes privately and requires a paid
plan to install.

## Subsequent releases

Bump the version, then publish. Use the verb that matches the change:

```sh
npm version patch    # rule wording, a bug fix
npm version minor    # new rules, new presets, new language
npm version major    # a rule changes meaning, or config shape breaks
```

`npm version` writes the tag and commits it, so push both:

```sh
git push && git push --tags
npm publish
```

### What counts as breaking

A new rule is **minor**, not major — consumers see it as a `+ new` artefact on
their next sync and can decline it. It becomes **major** when:

- an existing rule changes meaning, so a previously-passing codebase now fails
- `.standards/config.json` gains a required field, or a field changes shape
- a rule id is renamed or removed, breaking a project's lock entries

Consumers pin the version, so a major bump is a decision they make deliberately.
That is the point of pinning — see the drift section in the README.

## Publishing from CI

```yaml
- run: npm ci
- run: npm publish --access public
  env:
    NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

The token must be an **automation** token; a normal token fails the 2FA check in a
non-interactive environment.

## Unpublishing

npm allows unpublishing within 72 hours. After that, publish a patch that
supersedes the bad version and deprecate it:

```sh
npm deprecate @leondixon/agent-standards@0.2.1 "Broken rule generation, use 0.2.2"
```

Never unpublish a version that projects may already have pinned — deprecate instead.
