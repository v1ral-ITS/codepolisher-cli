# Security Policy

CodePolisher CLI handles provider credentials locally, so responsible disclosure is especially important to ImPerial TeK. Solutions.

## Supported versions

Security fixes are provided for the latest published `1.x` release.

## Report a vulnerability

Do not open a public GitHub issue for a suspected vulnerability.

Email [ITSolutions_MGNT@proton.me](mailto:ITSolutions_MGNT@proton.me) with:

- the affected version;
- reproduction steps or a proof of concept;
- the potential impact; and
- any suggested mitigation.

Please allow reasonable time for investigation and remediation before public disclosure. Never include real API keys, tokens, personal data, or credentials in a report.

## Credential model

CodePolisher sends review requests directly to the provider selected by the user. Provider keys are not routed through the CodePolisher website. For CI and shared machines, use environment variables and the platform's encrypted secret store.
