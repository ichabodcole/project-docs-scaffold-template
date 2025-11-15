# Project Recipe Command

You are tasked with analyzing the current project and creating a comprehensive recipe document that captures its structure, patterns, and setup in a way that can be used to scaffold similar projects in the future.

**Your workflow:**

1. **Analyze project foundation and tooling**

   Examine the project's foundational setup:

   - **Package manager and dependencies:**
     - Read `package.json` (or equivalent for other languages)
     - Note the package manager used (npm, pnpm, yarn, pip, cargo, etc.)
     - Identify dev dependencies (tooling) vs runtime dependencies
     - Note key frameworks and libraries

   - **Build and bundling:**
     - Look for build config files (vite.config, webpack.config, tsconfig, etc.)
     - Note the build tool and its configuration approach
     - Identify any special build steps or scripts

   - **Code quality tooling:**
     - Linting: ESLint, Pylint, Clippy, etc. (check for config files)
     - Formatting: Prettier, Black, rustfmt, etc.
     - Type checking: TypeScript, mypy, etc.
     - Pre-commit hooks: Husky, lint-staged, pre-commit, etc.

   - **Testing setup:**
     - Test framework (Jest, Vitest, pytest, etc.)
     - Test organization and conventions
     - Coverage tools

   - **Development environment:**
     - Environment variable patterns (.env files)
     - Development vs production configurations
     - Docker or containerization setup

2. **Analyze project structure and organization**

   Examine how the project is organized:

   - **Directory structure:**
     - Use `find . -type d -not -path '*/node_modules/*' -not -path '*/.git/*' | head -50` to get directory tree
     - Identify the high-level folder organization
     - Note conventions (src/, lib/, app/, components/, utils/, etc.)

   - **Code organization patterns:**
     - How are modules/components organized? (by feature, by type, hybrid)
     - File naming conventions (kebab-case, PascalCase, etc.)
     - Co-location patterns (tests next to code, styles next to components)

   - **Entry points and core files:**
     - Main application entry points
     - Configuration index files
     - Key bootstrapping files

3. **Identify architectural patterns and systems**

   Look for higher-level patterns and abstractions:

   - **Architectural patterns:**
     - MVC, MVVM, layered architecture, clean architecture, etc.
     - State management approach (if applicable)
     - Routing patterns (if applicable)
     - API/service layer patterns

   - **UI/Component patterns (if applicable):**
     - Component library or design system usage
     - Component composition patterns
     - Styling approach (CSS modules, styled-components, Tailwind, etc.)
     - Layout patterns

   - **Data patterns:**
     - Database/ORM setup (if applicable)
     - Data fetching patterns
     - Caching strategies
     - Data validation approaches

   - **Domain-specific systems:**
     - Identify any domain-specific abstractions or frameworks
     - Examples: AI agent orchestration, image processing pipeline, auth system, plugin architecture
     - Note: These are the patterns that may or may not be included based on user preference

4. **Categorize findings**

   Organize what you've discovered into categories:

   **A. Foundational (Always Include):**
   - Package manager and dependency management
   - Build tooling and configuration
   - Linting, formatting, type checking
   - Testing framework setup
   - Development environment setup

   **B. Structural Patterns (Usually Include):**
   - Directory organization and conventions
   - File naming and module patterns
   - Code organization approach
   - Entry point structure

   **C. Architectural Systems (Ask User):**
   - State management patterns
   - Routing/navigation setup
   - API/service layer patterns
   - UI component system or design patterns

   **D. Domain-Specific Systems (Ask User):**
   - Any specialized frameworks or abstractions
   - Domain-specific utilities or helpers
   - Custom tooling or scripts
   - Integration patterns for specific use cases

   **E. Application-Specific (Exclude):**
   - Actual business logic and features
   - Specific data models for this app
   - App-specific routes or pages
   - Content and assets specific to this app

5. **Present findings and ask user what to include**

   Use the AskUserQuestion tool to present your categorized findings:

   Create questions for categories C and D (Architectural Systems and Domain-Specific Systems).

   Example questions:
   - "Include state management setup? (Zustand store patterns, context setup, etc.)"
   - "Include UI component system? (Component library integration, theming, layout patterns)"
   - "Include authentication system patterns? (Auth provider, protected routes, session management)"
   - "Include [domain-specific system]? (e.g., AI agent orchestration framework, image processing pipeline)"

   **Important:**
   - Always include foundational (A) and structural (B) patterns - don't ask about these
   - For architectural systems (C), create clear questions about each distinct system
   - For domain systems (D), describe what they are and ask if user wants them in the recipe
   - Ask up to 4 questions maximum - combine related items if needed
   - Use multiSelect: false for each question (user picks yes/no for each system)

6. **Generate the PROJECT-RECIPE.md document**

   Create `docs/PROJECT-RECIPE.md` with this structure:

   ```markdown
   # Project Recipe: [Project Type Description]

   **Generated:** YYYY-MM-DD
   **Based on:** [Project name from package.json or README]
   **Project Type:** [e.g., "Electron Desktop App with React", "Expo React Native App", "Python FastAPI Backend"]

   ---

   ## Overview

   This recipe describes how to scaffold a new project using the same structure, tooling, and patterns as [source project]. It captures the foundational setup and architectural patterns that make this project structure effective.

   **What's included in this recipe:**
   - ✅ Foundational tooling and configuration
   - ✅ Project structure and organization conventions
   - ✅ Code quality and development workflow setup
   [List other included systems based on user selections]

   **What's NOT included:**
   - ❌ Application-specific business logic
   - ❌ Feature implementations
   - ❌ App-specific data models and content

   ---

   ## Technology Stack

   ### Runtime & Framework

   - **Primary Language:** [Language and version]
   - **Framework:** [Main framework - e.g., React 18, FastAPI, Electron]
   - **Runtime:** [Node.js, Python, etc. with version]

   ### Build & Development Tools

   - **Package Manager:** [npm/pnpm/yarn/pip/etc.]
   - **Build Tool:** [Vite/Webpack/tsc/etc.]
   - **Dev Server:** [If applicable]

   ### Code Quality

   - **Linting:** [ESLint, etc. with key plugins]
   - **Formatting:** [Prettier, etc. with key config]
   - **Type Checking:** [TypeScript, mypy, etc.]
   - **Pre-commit:** [Husky, lint-staged, etc.]

   ### Testing

   - **Framework:** [Jest/Vitest/pytest/etc.]
   - **Testing Libraries:** [Testing Library, etc.]
   - **Coverage:** [Coverage tool if used]

   ---

   ## Project Structure

   ### Directory Layout

   ```
   [Insert directory tree showing the organizational structure]
   project-root/
   ├── src/
   │   ├── components/     # [Description of what goes here]
   │   ├── services/       # [Description]
   │   ├── utils/          # [Description]
   │   └── ...
   ├── tests/              # [Description]
   ├── docs/               # [Description]
   ├── [other directories]
   └── ...
   ```

   ### Organization Principles

   **[Primary organization pattern - e.g., "Feature-based organization", "Layer-based organization"]**

   [1-2 paragraphs explaining the organizational philosophy]

   **Key conventions:**
   - [Convention 1 - e.g., "Components are organized by feature, not type"]
   - [Convention 2 - e.g., "Tests live alongside source files with .test.ts suffix"]
   - [Convention 3 - e.g., "Shared utilities live in src/utils, feature-specific in feature folder"]

   ### File Naming Conventions

   - **Components:** [e.g., PascalCase for React components: Button.tsx]
   - **Utilities:** [e.g., camelCase: formatDate.ts]
   - **Tests:** [e.g., *.test.ts or *.spec.ts]
   - **Config files:** [e.g., kebab-case: vite.config.ts]
   - [Other conventions]

   ---

   ## Setup Instructions

   ### 1. Initialize Project

   ```bash
   # Create project directory
   mkdir my-new-project
   cd my-new-project

   # Initialize package manager
   [npm init / pnpm init / etc.]
   ```

   ### 2. Install Core Dependencies

   **Framework and runtime:**
   ```bash
   [Installation commands for core dependencies]
   ```

   **Development dependencies:**
   ```bash
   [Installation commands for dev tools]
   ```

   Key dependencies to install:
   - [Dependency 1]: [Purpose]
   - [Dependency 2]: [Purpose]
   - [List 5-10 most important dependencies]

   ### 3. Configure Build Tooling

   **[Build tool name - e.g., Vite]**

   Create `[config file name]`:
   ```[language]
   [Key configuration showing the important patterns, not necessarily complete config]
   ```

   Key configuration points:
   - [Config point 1 and why it matters]
   - [Config point 2 and why it matters]

   [Repeat for other major config files: tsconfig, etc.]

   ### 4. Configure Code Quality Tools

   **Linting**

   Create `[linter config file]`:
   ```[format]
   [Key linting rules and plugins]
   ```

   **Formatting**

   Create `[formatter config file]`:
   ```[format]
   [Key formatting rules]
   ```

   **Pre-commit Hooks**

   [Setup instructions for pre-commit tooling]

   ### 5. Configure Testing

   **Test Framework Setup**

   [Configuration for test framework]

   **Test organization:**
   - [How tests are organized - e.g., "Co-located with source files"]
   - [Naming convention - e.g., "*.test.ts"]
   - [Test structure patterns]

   ### 6. Create Directory Structure

   ```bash
   mkdir -p src/[subdirs]
   mkdir -p tests
   mkdir -p docs
   # [Other directories]
   ```

   ### 7. Set Up Environment Configuration

   Create `.env.example`:
   ```
   [Example environment variables needed]
   ```

   **Environment setup:**
   - [How environment variables are loaded]
   - [Different environments: dev, test, prod]

   ### 8. Create Entry Points

   **Main entry point:** `src/[entry file]`
   ```[language]
   [Basic entry point structure showing initialization pattern]
   ```

   [Other entry points if applicable]

   ---

   ## Architectural Patterns

   [Include this section and subsections based on user selections in step 5]

   ### [Pattern 1 - e.g., State Management]

   **Approach:** [Brief description of the pattern]

   **Setup:**
   [How to set this up in a new project]

   **Key conventions:**
   - [Convention 1]
   - [Convention 2]

   **Example structure:**
   ```[language]
   [Code example showing the pattern]
   ```

   ### [Pattern 2 - e.g., Routing]

   [Repeat structure]

   ### [Pattern 3 - e.g., API Layer]

   [Repeat structure]

   ---

   ## Domain-Specific Systems

   [Include this section only if user selected any domain-specific systems]

   ### [System 1 - e.g., AI Agent Orchestration]

   **Purpose:** [What this system does]

   **Structure:**
   [Directory organization for this system]

   **Setup:**
   [How to set up this system in a new project]

   **Key abstractions:**
   - [Abstraction 1 with brief explanation]
   - [Abstraction 2 with brief explanation]

   **Usage pattern:**
   ```[language]
   [Example showing how this system is typically used]
   ```

   ---

   ## Development Workflow

   ### Available Scripts

   [Based on package.json scripts or equivalent]

   - `[script command]`: [What it does]
   - `[script command]`: [What it does]
   - [List key scripts]

   ### Common Development Tasks

   **Starting development:**
   ```bash
   [Command to start dev environment]
   ```

   **Running tests:**
   ```bash
   [Command to run tests]
   ```

   **Building for production:**
   ```bash
   [Command to build]
   ```

   **Linting and formatting:**
   ```bash
   [Commands for code quality checks]
   ```

   ---

   ## Best Practices & Conventions

   ### Code Organization

   - [Best practice 1 - e.g., "Keep components small and focused"]
   - [Best practice 2 - e.g., "Co-locate related files"]
   - [Best practice 3]

   ### Naming & Style

   - [Convention 1 - e.g., "Use descriptive names over abbreviations"]
   - [Convention 2 - e.g., "Prefix boolean variables with is/has/should"]
   - [Convention 3]

   ### Testing

   - [Practice 1 - e.g., "Test behavior, not implementation"]
   - [Practice 2 - e.g., "Maintain >80% coverage for critical paths"]
   - [Practice 3]

   ### Documentation

   - [Practice 1 - e.g., "Document 'why' in comments, not 'what'"]
   - [Practice 2 - e.g., "Keep README up to date with setup changes"]
   - [Practice 3]

   ---

   ## Key Files Reference

   ### Configuration Files

   | File | Purpose | Notes |
   |------|---------|-------|
   | `[file]` | [Purpose] | [Important notes] |
   | `[file]` | [Purpose] | [Important notes] |

   ### Important Source Files

   | File | Purpose | Notes |
   |------|---------|-------|
   | `[file]` | [Purpose] | [Important notes] |
   | `[file]` | [Purpose] | [Important notes] |

   ---

   ## Adapting This Recipe

   ### For Similar Projects

   This recipe works well for:
   - [Project type 1 - e.g., "Desktop applications using Electron"]
   - [Project type 2 - e.g., "React-based applications with complex state"]
   - [Use case]

   ### Customization Points

   Common customizations when using this recipe:

   1. **[Customization 1 - e.g., "Swap Zustand for Redux"]**
      - [When you might want this]
      - [How to adapt the recipe]

   2. **[Customization 2]**
      - [When you might want this]
      - [How to adapt the recipe]

   ### What to Change for Different Domains

   If adapting for a different domain:
   - [Guidance 1 - e.g., "Replace UI component system with domain-appropriate patterns"]
   - [Guidance 2]

   ---

   ## Gotchas & Important Notes

   [Lessons learned from this project structure - things that aren't obvious]

   - ⚠️ [Gotcha 1 - e.g., "Build config requires X setting for hot reload to work"]
   - ⚠️ [Gotcha 2]
   - 💡 [Tip 1 - e.g., "Use absolute imports to avoid ../../../ hell"]
   - 💡 [Tip 2]

   ---

   ## Maintenance

   **Updating this recipe:**

   When the source project evolves significantly:
   - Run `/project-recipe` again to regenerate
   - Compare with previous version to see what changed
   - Update dependent projects if breaking changes occurred

   **Recipe version:** 1.0.0 (YYYY-MM-DD)

   ---

   *This recipe was generated by analyzing [source project] on YYYY-MM-DD. It represents the project structure and patterns at that point in time.*
   ```

7. **Present results to user**

   After creating the recipe, tell the user:
   - **Recipe saved to:** `docs/PROJECT-RECIPE.md`
   - Brief summary of what was included:
     - Foundational tooling: [list 2-3 key tools]
     - Structural patterns: [list 1-2 key patterns]
     - [Any included architectural or domain systems]
   - Remind them this recipe can be used to scaffold similar projects
   - Suggest they version the recipe (git commit) so they can track how it evolves

**Important notes:**

- Focus on **structure and patterns**, not specific application code
- The recipe should be **actionable** - someone should be able to follow it to create a similar project
- Keep code examples **minimal and illustrative** - show the pattern, not complete implementations
- **Categorize clearly** what's foundational vs. optional so users can adapt
- When in doubt about whether something is "structural" vs "application-specific", **ask the user**

**Quality checks:**

Before completing, ask yourself:
- ✅ Could someone scaffold a similar project following this recipe?
- ✅ Are foundational patterns clearly documented?
- ✅ Are setup instructions complete and actionable?
- ✅ Did you exclude application-specific details?
- ✅ Are architectural patterns explained with context, not just listed?
