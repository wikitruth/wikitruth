# Security Policy

Wikitruth welcomes responsible reports that help keep the project and its
users safe.

## Supported Versions

Security fixes are prepared on the current `develop` branch and released
through `master`. Only the current heads of those branches are supported.
Older commits, forks, and privately maintained deployments may not receive
security updates.

## Reporting a Vulnerability

Do not open a public issue or pull request for an undisclosed vulnerability.
Instead, email `dsalunga@live.com` with:

- a concise description of the vulnerability and its impact;
- the affected version, commit, route, or component;
- reproducible steps or a minimal proof of concept;
- any suggested mitigation; and
- whether the report or its details may be publicly credited after a fix.

Do not access, alter, retain, or disclose data belonging to other people while
investigating a potential vulnerability. Use synthetic data and the smallest
safe proof necessary.

The project will acknowledge a report as soon as practical, assess its scope,
and coordinate remediation and disclosure with the reporter. Please allow a
reasonable remediation window before publishing details.

## Security Expectations for Contributions

- Never commit credentials, secrets, private keys, production data, session
  material, or personal data.
- Use synthetic fixtures in tests and examples.
- Keep authentication, authorization, validation, and tenant boundaries
  fail-closed.
- Include focused regression tests for security-sensitive changes.
- Report dependency and supply-chain concerns through the same private channel
  when public disclosure could put users at risk.
