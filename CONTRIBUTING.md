# Contributing to CodePolisher CLI

Thank you for helping improve an ImPerial TeK. Solutions project.

## Before opening a change

- Search existing issues and pull requests.
- Use an issue for substantial features or behavior changes.
- Keep provider-specific changes isolated and avoid unrelated rewrites.
- Never commit provider keys, tokens, local configuration, or generated package archives.

## Development

```bash
git clone https://github.com/v1ral-ITS/codepolisher-cli.git
cd codepolisher-cli
npm ci
npm test
node bin/codepolisher.js --help
```

## Pull requests

Pull requests should explain what changed, why it changed, user impact, and verification performed. All tests must pass on supported Node.js versions.

By contributing, you agree that your contribution is licensed under the repository's MIT License.
