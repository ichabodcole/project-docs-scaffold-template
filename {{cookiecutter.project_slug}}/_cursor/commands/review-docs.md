# Review and Cleanup Documentation Status

You are tasked with reviewing project documentation to determine implementation status and perform cleanup operations.

**Documentation types to review:** investigations, plans, and proposals in `docs/` directory

## Your Workflow

### 1. Discover Documents to Review

- List all documents in `docs/investigations/`, `docs/plans/`, and `docs/proposals/`
- Exclude template files (TEMPLATE in filename) and README files
- Exclude files already in archive folders
- Present the user with a list of documents found and ask which ones to review (or confirm to review all)

### 2. For Each Document, Perform Detective Work

**Read the document** to understand:
- What was the goal/objective?
- What features or changes were proposed/planned/investigated?
- Are there specific file paths, components, or features mentioned?
- What was the expected outcome or deliverables?

**Check implementation status** by:
- Searching the codebase for mentioned files, components, or features
- Looking for code that implements the described functionality
- Checking git history for related commits (use `git log --grep` with relevant keywords)
- Scanning `docs/sessions/` for session notes that might reference this work
- Cross-referencing with other related documents

**Determine status** based on findings:
- **Completed/Implemented**: Code exists, features work, objectives achieved
- **Partially Completed**: Some aspects implemented, others not
- **Not Started**: No evidence of implementation in codebase
- **Abandoned/Obsolete**: Superseded by other work or no longer relevant

### 3. Update Document Status

- Look for a status field or section in the document
- If found, update it to reflect current status
- If not found, add a status section at the top of the document (after title/frontmatter):
  ```markdown
  **Status:** [Completed/Partially Completed/Not Started/Abandoned] (as of YYYY-MM-DD)
  ```
- For partial completion, add notes about what's done and what remains
- Add implementation references (file paths, commit SHAs, related sessions) if applicable

### 4. Archive Completed Documents

For documents marked as **Completed** or **Abandoned**:
- Move the document to the `archive/` subdirectory within its type folder
- Example: `docs/plans/feature-plan.md` → `docs/plans/archive/feature-plan.md`
- Use `git mv` command to preserve history

For **Partially Completed** or **Not Started**:
- Leave in the main folder (active work area)

### 5. Provide Summary Report

Present a structured, scannable summary with:

**COMPLETED & ARCHIVED:**
- [Document name] - archived to [path]
  - Summary: [brief description of what was implemented]
  - Evidence: [key files/commits found]

**PARTIALLY COMPLETED:**
- [Document name] - [XX%] complete
  - Done: [what's implemented]
  - Remaining: [what's not done]
  - Evidence: [relevant code/commits]

**NOT STARTED:**
- [Document name]
  - Reason if apparent: [e.g., deprioritized, blocked, etc.]

**ABANDONED/OBSOLETE:**
- [Document name] - archived to [path]
  - Reason: [why it's no longer relevant]

**NEEDS ATTENTION:**
- [Documents that require clarification or decision]

**SUMMARY STATISTICS:**
- Total documents reviewed: X
- Completed: X (archived)
- Partially completed: X (remain active)
- Not started: X (remain active)
- Abandoned: X (archived)

## Important Notes

- Be thorough in your investigation - check multiple sources of truth
- When in doubt about implementation status, mark as "Partially Completed" and note uncertainty
- Preserve document content - only update status sections
- If a document has no clear objective or is poorly written, note this in your summary
- Use git commands carefully to preserve document history during moves

## Example Investigation Process

For a plan titled "Implement dark mode toggle":
1. Search for "dark mode", "theme", or "toggle" in codebase
2. Look for theme-related components, context providers, or CSS variables
3. Check recent commits for theme-related changes
4. Scan session docs for dark mode implementation notes
5. Test if dark mode actually works (if running project is feasible)
6. Make determination and update document accordingly
