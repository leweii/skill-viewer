# Privacy Policy for Skill Viewer

**Last Updated:** January 21, 2026

## Overview

Skill Viewer is a Chrome extension that displays Claude Code skills found in GitHub repositories with AI-powered summaries. This privacy policy explains how we collect, use, and protect your information.

## Information We Collect

### 1. Authentication Data
When you sign in using GitHub or Google OAuth:
- Email address
- User ID (from OAuth provider)
- Authentication tokens (stored locally)

This information is used solely for authentication and to track your usage quota.

### 2. Usage Data
- Daily summary request count (to enforce usage limits)
- Skill view counts (aggregated, anonymous)
- Skill collection counts (aggregated, anonymous)

### 3. Skill Content
When you request a summary, we temporarily process:
- Repository name
- Skill file path
- Skill content

This data is used only to generate AI summaries and is cached to improve performance.

## Information We Do NOT Collect

- Browsing history
- Personal files
- Passwords or credentials (other than OAuth tokens)
- Financial information
- Location data
- Any data from non-GitHub websites

## How We Use Your Information

| Data | Purpose |
|------|---------|
| Email | Account identification |
| User ID | Link usage quota to your account |
| Auth tokens | Authenticate API requests |
| Usage count | Enforce daily limits |
| Skill content | Generate AI summaries |

## Data Storage

### Local Storage (Your Browser)
- Authentication tokens
- User preferences (language, theme)
- Cached summaries (24-hour expiry)

### Cloud Storage (Supabase)
- User account information
- Usage statistics
- Cached summaries (7-day expiry)

All cloud data is stored securely using Supabase with row-level security enabled.

## Third-Party Services

### 1. Supabase (Database & Authentication)
- Stores user accounts and cached summaries
- Privacy Policy: https://supabase.com/privacy

### 2. Google Gemini (AI Summaries)
- Processes skill content to generate summaries
- Privacy Policy: https://policies.google.com/privacy

### 3. GitHub (OAuth & Content)
- Provides authentication
- Source of skill file content
- Privacy Policy: https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement

## Data Retention

| Data Type | Retention Period |
|-----------|------------------|
| Auth tokens | Until you log out |
| Local cache | 24 hours |
| Cloud cache | 7 days |
| Usage stats | Reset daily |
| Account data | Until account deletion |

## Your Rights

You have the right to:

1. **Access** - View your stored data
2. **Delete** - Remove your account and data
3. **Opt-out** - Use the extension without signing in (limited features)
4. **Export** - Request a copy of your data

To exercise these rights, contact us at the email below.

## Data Security

We implement security measures including:
- HTTPS encryption for all data transmission
- Secure OAuth 2.0 authentication
- Row-level security in our database
- No storage of OAuth provider passwords

## Children's Privacy

This extension is not intended for children under 13. We do not knowingly collect data from children.

## Changes to This Policy

We may update this privacy policy from time to time. Changes will be posted on this page with an updated revision date.

## Open Source

This extension is open source. You can review our code at:
https://github.com/anthropics/claude-code

## Contact

For privacy-related questions or concerns, please:
- Open an issue on GitHub: https://github.com/anthropics/claude-code/issues
- Email: privacy@example.com

## Permissions Explained

| Permission | Why We Need It |
|------------|----------------|
| `storage` | Save your preferences and cached data locally |
| `activeTab` | Detect when you're on a GitHub repository page |
| `identity` | Enable Google/GitHub sign-in |
| `host_permissions` | Access GitHub API and our cloud services |

---

By using Skill Viewer, you agree to this privacy policy.
