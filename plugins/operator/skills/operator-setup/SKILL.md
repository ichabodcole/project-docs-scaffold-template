---
name: operator-setup
description:
  Setup, authentication and session usage for Operator Editor MCP access
---

# Operator Setup

**Operator Editor** is a document editor with MCP server integration for reading
and writing documents.

## When to Use

Activate when:

- User mentions "Operator" for the first time in a session
- Authentication is needed to access Operator
- User needs help setting up their `.operator` configuration

## Configuration File

The `.operator` file stores credentials in the working directory:

```
OPERATOR_API_KEY=mcp_xxx...
OPERATOR_SESSION_ID=abc123...
```

## Authentication Flow

1. **Check for `.operator` file**
   - If absent: Offer to create it (see "First-Time Setup" below)

2. **Check for cached session ID**
   - If `OPERATOR_SESSION_ID` exists, try using it directly
   - Sessions are valid for 24 hours

3. **If session is expired or missing**
   - Authenticate using `OPERATOR_API_KEY`
   - Update `.operator` file with the new `OPERATOR_SESSION_ID`
   - This avoids creating unnecessary new sessions

## First-Time Setup

If no `.operator` file exists, explain the options:

1. Provide API key directly for this session only (no file created)
2. Create `.operator` file to persist credentials

If they choose option 2, be explicit: "I'll create a `.operator` file with your
API key and add it to `.gitignore` to keep it out of version control." Get
confirmation before creating files.

## Session Reuse

Always prefer reusing an existing session:

- Same project = same session (within 24 hours)
- Only re-authenticate when the session is expired
- Update the file with new session ID after re-authentication

## After Setup

Once authenticated, use the MCP tools directly - their descriptions provide all
operation details.
