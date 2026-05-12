# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in OpenBench, please report it responsibly.

**Do NOT open a public GitHub issue for security vulnerabilities.**

Instead, email: **security@openbench.ai**

We will acknowledge receipt within 48 hours and provide an estimated fix timeline within 5 business days.

## Scope

The following are in scope:
- API injection or abuse (repo ID manipulation, SQL injection)
- CORS misconfiguration that allows unauthorized access
- Secrets exposure in committed code or build artifacts
- Rate limit bypasses
- Denial of service via crafted GGUF headers

The following are out of scope:
- Inaccurate benchmark estimates (report as a bug, not a security issue)
- Social engineering attacks
- Attacks requiring physical access

## Supported Versions

| Version | Supported |
|---------|-----------|
| latest  | ✅        |
| < latest | ❌       |

## Best Practices for Contributors

- Never commit `.env` files, API keys, tokens, or credentials
- Use `.env.example` files for configuration templates
- All secrets must be loaded from environment variables
- Run `git log --diff-filter=A -- '*.env' '*.key' '*.pem'` before pushing to verify no secrets were committed
