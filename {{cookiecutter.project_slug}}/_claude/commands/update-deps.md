---
description: "Automate dependency updates with testing and validation"
allowed_tools: ["Read", "Write", "Grep", "Glob", "Terminal"]
---

You are tasked with automating the process of updating project dependencies in a safe, tested manner.

**Your workflow:**

1. **Pre-flight checks**
   - Check git status to see if there are any uncommitted changes
   - If there are uncommitted changes, stash them with `git stash push -m "Auto-stash before deps update"`
   - Note that changes were stashed so you can remind the user to restore them later

2. **Create update branch**
   - Generate a timestamp in format `YYYYMMDD-HHMM` (e.g., `20251010-1430`)
   - Create and checkout a new branch: `chore/deps-update-<timestamp>`
   - Example: `git checkout -b chore/deps-update-20251010-1430`

3. **Detect package manager**
   - Check which package manager is in use by looking for:
     - `pnpm-lock.yaml` → use pnpm
     - `yarn.lock` → use yarn
     - `package-lock.json` → use npm
   - Use the detected package manager for all subsequent commands

4. **Analyze outdated dependencies**
   - Run the outdated command for the detected package manager:
     - npm: `npm outdated`
     - pnpm: `pnpm outdated`
     - yarn: `yarn outdated`
   - Capture and save this output to reference in your final summary

5. **Update dependencies**
   - Run the update command for the detected package manager:
     - npm: `npm update`
     - pnpm: `pnpm update`
     - yarn: `yarn upgrade`
   - Note: These commands typically only update within the semver ranges specified in package.json

6. **Verify the updates**
   - Run tests if a test script exists in package.json:
     - `npm test` / `pnpm test` / `yarn test`
   - Run type checking if applicable:
     - Check for `typecheck` or `type-check` script in package.json
     - Or run `tsc --noEmit` if TypeScript is detected
   - Run build if a build script exists:
     - `npm run build` / `pnpm build` / `yarn build`
   - If any of these fail, report the failure to the user and stop (do not commit)

7. **Commit the changes**
   - Stage all changes: `git add .`
   - Create a descriptive commit message:
     ```
     chore: update dependencies
     
     - Updated dependencies to latest compatible versions
     - All tests, type checks, and builds passing
     ```
   - Commit: `git commit -m "chore: update dependencies"`

8. **Provide summary**
   - Report what was updated (based on the outdated command output)
   - Highlight any packages that were NOT updated (likely due to major version constraints)
   - **IMPORTANT:** If changes were stashed in step 1, explicitly call this out in your response:
     - State clearly that changes were stashed before creating the branch
     - Remind the user they need to restore them with `git stash pop` after they're done
     - This prevents confusion when they return to their work
   - Inform the user of the branch name and next steps:
     - Review the changes
     - Run any additional manual testing
     - Merge the branch when ready
     - Restore any stashed changes if applicable
     - Consider updating packages with major version changes separately

**Important notes:**
- Be cautious and stop if anything fails during testing
- Don't force any operations
- Preserve user's work by stashing if needed
- Let the user make the final decision to merge

