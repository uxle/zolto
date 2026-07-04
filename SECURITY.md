# Security Policy

## Supported Versions
| Version | Supported |
|---------|-----------|
| 2.x.x   | ✓ Active  |
| 1.x.x   | ✓ Active  |
| < 1.0   | ✗ No      |

## Reporting a Vulnerability
**Do not open a public GitHub issue for security vulnerabilities.**

Email **security@zolto.dev** with:
1. A description of the vulnerability
2. Steps to reproduce it
3. Potential impact
4. Any suggested mitigation

We aim to acknowledge receipt within 48 hours and provide a resolution timeline within 7 days.

## Scope
- XSS via unsanitised HTML output
- Prototype pollution via document variables or metadata
- ReDoS (regular expression denial of service) in the lexer/parser
- Arbitrary code execution via `@import` path traversal
