# Technology Decision Guide

Framework for evaluating technology choices when building from specifications.
Use this to inform recommendations when the user is unsure about a decision.

---

## Decision Criteria

When recommending technologies, weigh these factors:

| Factor               | Weight | Description                                                               |
| -------------------- | ------ | ------------------------------------------------------------------------- |
| Spec Fit             | High   | Does the technology naturally support what the spec requires?             |
| Ecosystem            | High   | Are there mature libraries for the spec's domains (audio, offline, etc.)? |
| User Familiarity     | High   | Does the user/team already know this technology?                          |
| Community            | Medium | Active community, good documentation, StackOverflow answers?              |
| Longevity            | Medium | Stable, maintained, not likely to be abandoned?                           |
| Performance          | Medium | Meets the non-functional requirements?                                    |
| Developer Experience | Low    | Nice-to-have ergonomics, tooling quality                                  |

**Rule of thumb:** User familiarity often outweighs technical superiority. A
team that knows Vue will ship faster in Vue than learning React, even if React
has slightly better tooling for the use case.

---

## Platform Decision Matrix

| Requirement from Spec | Web (SPA/PWA)          | Native Mobile       | Cross-Platform Mobile | Desktop   |
| --------------------- | ---------------------- | ------------------- | --------------------- | --------- |
| Offline-first         | Good (Service Workers) | Excellent           | Good                  | Excellent |
| Audio playback        | Good (Web Audio API)   | Excellent           | Good                  | Good      |
| Background audio      | Limited                | Excellent           | Limited               | Good      |
| Push notifications    | Limited (Web Push)     | Excellent           | Good                  | Good      |
| File system access    | Limited                | Excellent           | Good                  | Excellent |
| Camera/sensors        | Limited                | Excellent           | Good                  | Limited   |
| Install on device     | Good (PWA)             | Native              | Native                | Native    |
| Cross-platform        | Excellent              | Poor (per-platform) | Good                  | Varies    |
| Development speed     | Fast                   | Slower              | Medium                | Medium    |

---

## Framework Recommendations by Platform

### Web Applications

| Framework                    | Best For                           | Considerations                         |
| ---------------------------- | ---------------------------------- | -------------------------------------- |
| Next.js (React)              | Full-stack, SSR, complex apps      | Large ecosystem, heavy for simple apps |
| Nuxt (Vue)                   | Full-stack, SSR, medium apps       | Approachable, good DX                  |
| SvelteKit                    | Performance-critical, smaller apps | Smaller ecosystem, growing fast        |
| Astro                        | Content-heavy with islands         | Not ideal for highly interactive apps  |
| Plain SPA (Vite + React/Vue) | Client-only, offline-first         | Simpler, no SSR complexity             |

### Mobile Applications

| Framework              | Best For                      | Considerations                       |
| ---------------------- | ----------------------------- | ------------------------------------ |
| React Native           | Cross-platform, JS teams      | Large ecosystem, some native gaps    |
| Flutter                | Cross-platform, pixel-perfect | Dart language, growing ecosystem     |
| SwiftUI                | iOS-only, Apple ecosystem     | Best iOS experience, Apple-only      |
| Kotlin/Jetpack Compose | Android-only                  | Best Android experience, Google-only |
| Expo (React Native)    | Cross-platform, rapid dev     | Managed workflow, some native limits |

### Desktop Applications

| Framework       | Best For                     | Considerations                |
| --------------- | ---------------------------- | ----------------------------- |
| Electron        | Web tech team, full featured | Heavy on resources            |
| Tauri           | Web tech team, lightweight   | Rust backend, smaller bundles |
| SwiftUI (macOS) | Mac-only                     | Native performance            |
| .NET MAUI       | Windows-focused              | Microsoft ecosystem           |

---

## Styling Approach Decision

| Approach             | Best For                            | Framework Fit         |
| -------------------- | ----------------------------------- | --------------------- |
| Tailwind CSS         | Rapid prototyping, utility-first    | Any web framework     |
| CSS Modules          | Component isolation, team standards | React, Vue, Svelte    |
| Styled Components    | Dynamic styling, JS-driven themes   | React                 |
| shadcn/ui            | Pre-built accessible components     | React (Next.js, Vite) |
| Vuetify / PrimeVue   | Pre-built Material components       | Vue                   |
| NativeBase / Tamagui | Cross-platform components           | React Native          |

---

## Data Layer Decision

### Local Storage

| Technology                          | Platform     | Best For                           |
| ----------------------------------- | ------------ | ---------------------------------- |
| IndexedDB (via Dexie, idb)          | Web          | Structured data, offline-first web |
| SQLite (via better-sqlite3, sql.js) | Web/Desktop  | Complex queries, large datasets    |
| AsyncStorage                        | React Native | Simple key-value pairs             |
| WatermelonDB                        | React Native | Large offline datasets             |
| Core Data                           | iOS/macOS    | Native Apple apps                  |
| Room                                | Android      | Native Android apps                |
| Hive / Isar                         | Flutter      | Dart-native local storage          |

### State Management

| Technology    | Framework          | Best For                        |
| ------------- | ------------------ | ------------------------------- |
| Zustand       | React              | Simple, lightweight state       |
| Redux Toolkit | React              | Complex, predictable state      |
| Pinia         | Vue                | Vue's official state management |
| Svelte Stores | Svelte             | Built-in, simple                |
| Riverpod      | Flutter            | Flutter's recommended           |
| MobX          | React/React Native | Observable-based                |

---

## Audio/Media Considerations

When specs include audio features, evaluate:

| Requirement         | Web Solution            | Mobile Solution                             |
| ------------------- | ----------------------- | ------------------------------------------- |
| Short sound effects | Web Audio API           | Native audio APIs                           |
| Background music    | Web Audio API + loop    | AVAudioSession (iOS), MediaPlayer (Android) |
| Precise timing      | Web Audio API scheduler | Native audio scheduling                     |
| Offline audio       | Cache API / IndexedDB   | Bundle or download to storage               |
| Multiple streams    | Web Audio mixer nodes   | Native mixer APIs                           |
| Format support      | MP3 + AAC fallback      | Platform-native codecs                      |

---

## Testing Framework Decision

| Type        | Web Options                | Mobile Options                    |
| ----------- | -------------------------- | --------------------------------- |
| Unit        | Vitest, Jest               | Jest, XCTest, JUnit               |
| Component   | Testing Library, Storybook | Testing Library, SwiftUI Previews |
| Integration | Playwright, Cypress        | Detox, Appium                     |
| E2E         | Playwright, Cypress        | Maestro, Detox                    |

**Recommendation pattern:** Match testing framework to the main framework's
ecosystem. Use what the framework recommends unless there's a specific reason
not to.

---

## Build & Deployment Decision

| Target                | Build Tool              | Deployment                        |
| --------------------- | ----------------------- | --------------------------------- |
| Static web (PWA)      | Vite                    | Vercel, Netlify, Cloudflare Pages |
| SSR web               | Next.js/Nuxt build      | Vercel, Railway, Fly.io           |
| iOS app               | Xcode                   | App Store (TestFlight)            |
| Android app           | Gradle                  | Play Store (Internal Testing)     |
| Cross-platform mobile | EAS Build (Expo)        | App Store + Play Store            |
| Desktop               | Electron Builder, Tauri | Direct download, App stores       |

---

## Interview Anti-Patterns

Avoid these common mistakes during the technical interview:

**Over-engineering:** Don't recommend microservices for a single-user offline
app. Match complexity to the spec.

**Trend-chasing:** Don't recommend the newest framework just because it's new.
Prefer stable, well-documented options.

**Ignoring user context:** If the user says "I know Python," don't push them
toward TypeScript without good reason.

**Decision fatigue:** Don't present 10 options for every choice. Recommend one
with brief rationale, offer 1-2 alternatives.

**Premature optimization:** Don't recommend complex caching, CDN, or scaling
solutions for an app that will have one user.

---

## Dependency Versioning

When listing dependencies in the blueprint:

- **Pin major versions:** `react@18`, `next@14`, `tailwindcss@3`
- **Use current stable:** Check latest stable release, don't recommend RC/beta
- **Note compatibility:** If Library A requires Library B >= version X, note
  that
- **Prefer fewer dependencies:** Each dependency is a maintenance burden

---

## Mapping Specs to Code Structure

When creating the "Spec Domain → Implementation" mapping:

```
| Spec Domain | Implementation Pattern |
|-------------|----------------------|
| Data entity (Timers, Sessions) | Model + Service + Repository |
| System (Audio, Notifications) | Service + Hook/Provider |
| Settings | Store/Context + Service |
| UI/Screens | Pages/Routes + Components |
| Statistics | Computed/derived from queries |
| Data Management | Service + Import/Export utilities |
```

Adapt the pattern column to the chosen framework's conventions:

- React: hooks + context + services
- Vue: composables + stores + services
- Flutter: providers + repositories + services
- SwiftUI: ObservableObject + repositories + services

---

## Checklist Before Finalizing Blueprint

- [ ] Every spec domain has a corresponding implementation area
- [ ] All major dependencies listed with versions
- [ ] Project structure includes all needed directories
- [ ] Testing strategy covers critical paths from specs
- [ ] Deployment target is clear and achievable
- [ ] Non-functional requirements have measurable targets
- [ ] No contradictions between spec requirements and tech choices
- [ ] Open questions section captures anything unresolved
