# TiMix Agent Worklog

This file is the shared memory for human collaborators and coding agents.

Purpose:
- Make future agents understand what previous agents did.
- Reduce repeated rediscovery.
- Record decisions, not just commits.
- Keep handoff context inside the repository instead of only in chat history.

Rules:
- Update this file for every meaningful feature, bug fix, migration, or design decision.
- Keep entries factual and short.
- Do not paste secrets, API keys, Supabase anon keys, cookies, or private tokens.
- If an old chat says something, verify it against code before calling it current truth.
- If a change was discussed but not implemented, mark it clearly as "not implemented".

## Current Project Snapshot

- Project: TiMix, evolved from "Timin观察站".
- Current remote: `https://github.com/hfeng620-cmd/timix_share.git`
- Main branch: `main`
- Main local path on Tian's machine: `C:\Users\Tian\Documents\Codex\2026-06-22\wo\work\api-test-and-forum-backup`
- Tech stack: Next.js 16, React 19, TypeScript, Tailwind CSS, Supabase, lucide-react, emoji-picker-react.
- VPS deploy command: `cd ~/timix_share && git pull origin main && rm -rf .next && npm run build && pm2 restart timin`

## Permanent Project Constraints

- The Supabase user profile table is `forum_profiles`, not `profiles`.
- Homepage `/` does not use the global image slider.
- Non-home pages use the existing `BackgroundSlider` system.
- Do not use native browser alerts.
- Reuse the existing DM, notification, discussion, profile, share, and monitoring systems.
- Keep the design mature, restrained, and tool-like. Avoid cheap AI-style card stacks and long explanatory hero copy.

## Active Architecture Notes

### Backgrounds

- `src/components/background-slider-wrapper.tsx` skips `/`.
- `src/components/background-slider.tsx` owns non-home background images.
- `public/bg-2-hd.jpg` was removed because it did not fit.
- Only complete large horizontal images should be added to the slider.
- Wallpaper Engine exports often include masks, particles, effects, previews, and transparent layers; do not add those as backgrounds.

### Profiles And Roles

- `owner` renders as red `TiMix 站主`.
- `admin` renders as blue `管理员`.
- `custom_title` renders as a purple title badge.
- Do not show admins as owners.

### Direct Messages

- Main modal: `src/components/direct-message-modal.tsx`
- Global inbox: `src/components/global-inbox-modal.tsx`
- Storage: `src/lib/direct-message-storage.ts`
- The DM textarea should keep focus after Enter send.
- Emoji insertion should reuse the existing emoji picker pattern.

### Share / Guides

- `/guides` is the "热门有趣项目Share" area.
- Core files:
  - `src/app/guides/page.tsx`
  - `src/components/share-create-modal.tsx`
  - `src/lib/share-storage.ts`
  - `supabase/shared-projects-schema.sql`
- Main tables include `shared_folders` and `shared_posts`.

### Station Monitoring

- Monitoring data should stay outside the base `stations` table.
- Core files:
  - `supabase/station-monitoring-schema.sql`
  - `src/lib/station-monitor-storage.ts`
  - `src/components/station-monitor-panel.tsx`
- Main structures:
  - `station_monitors`
  - `station_metric_snapshots`
  - `station_monitor_latest`
- Real collection should be done by VPS worker, cron, Supabase Edge Function, or a separate backend task.

## Historical Timeline

### 2026-06-22 To 2026-06-23: Original Product Direction

Source: older Codex threads.

- Initial goal: build a station testing/ranking site plus an L-site-style technical discussion community.
- Intended audience: Tian's roughly 200-person QQ group.
- Early project name: `Timin观察站`.
- Early repo: `hfeng620-cmd/timin_api_test_and_forum`.
- The project later moved/evolved into this backup/share repo and `timix_share`.

Important product preference from this phase:
- Homepage should show useful station/ranking information quickly.
- Community should feel real and clean, not filled with fake seed posts.
- User dislikes "AI味", cheap block layouts, and long explanatory text.

### 2026-06-27: Claude Code Full Review

Source: Claude Code local transcript.

Claude Code launched 6 review agents:
- Code quality and TypeScript
- Security
- Performance
- UI/UX
- Database and Supabase
- Build and deployment

Historical findings included:
- `DiscussionFeed` and `StationsBoard` were very large and should eventually be split.
- Too many client components were mounted globally.
- Heavy components should use dynamic import where practical.
- Canvas, video, animation, Three.js, and polling can hurt performance.
- RLS policies for `stations` and `notifications` needed scrutiny.
- Dynamic field updates such as `approvePendingEdit` need strict whitelists.
- Admin UI must be backed by Supabase RLS/RPC checks, not only frontend hiding.
- Some query paths had N+1 risk.
- Modal/form accessibility needed improvement.
- Mobile global navigation was once incomplete.

Later in that Claude session, some UI issues were reportedly fixed:
- Mobile navigation on subpages.
- `forum-auth-modal` labels, dialog role, and ARIA attributes.
- `announcement-modal` dialog semantics, Escape close, and scroll lock.

Do not assume every old finding is still true. Verify current code before acting.

### Recent Codex Changes On `timix_share`

Recent commits seen in this repo:

- `cff333dd 追加横屏背景轮播图片`
- `1b8ecec8 移除不适配的背景图`
- `43742b17 优化私信输入焦点和表情选择`
- `574f11c4 新增全局私信收件箱入口`
- `a579a1ac 修复身份标识并支持自定义头衔`
- `f1b06880 修复公开主页私信入口`
- `38e80390 优化后台私信入口和评论限频`
- `52a13910 完善站点讨论筛选解析`

Key outcomes:
- Admin user list gained DM entry.
- Comment cooldown was reduced to 3 seconds.
- Admins/owners bypass comment cooldown.
- Native alert usage in affected comment flows was replaced with UI feedback.
- Public profile and user card DM entries were added.
- Global inbox was added.
- DM input focus and emoji insertion were improved.
- Owner/admin/custom title badges were fixed.
- Non-home background slider got selected horizontal images.
- `bg-2-hd.jpg` was removed.

## Open Watchlist

These are not necessarily bugs today, but future agents should check them when relevant:

- RLS policies for user-generated data, notifications, station edits, and admin actions.
- Whether all admin actions are enforced by RPC/RLS, not only UI checks.
- Large components: `discussion-feed.tsx`, `stations-board.tsx`, `admin/page.tsx`.
- Performance cost of global client components and animated backgrounds.
- Whether `next/dynamic` can defer heavy modals, admin tools, emoji picker, Three.js, and media code.
- Whether `getUserReplies` or similar profile enrichment paths still have N+1 queries.
- Whether all modal/dialog components have keyboard and ARIA support.
- Whether current VPS PM2 process is truly using production `next start`.

## Entry Template

Copy this for new work:

```md
### YYYY-MM-DD: Short Task Title

Agent:
- Name/tool:

User request:
- 

Files changed:
- 

What changed:
- 

Decisions:
- 

Verification:
- `npm run build`: pass/fail/not run
- `npm run lint`: pass/fail/not run
- Other:

Commit/push:
- Commit:
- Pushed:

Follow-ups:
- 
```

## New Entries

### 2026-07-03: Add README Agent Onboarding Entry

Agent:
- Codex

User request:
- Make the project introduction itself tell future collaborators/agents what to read, so Tian does not need to repeat the same instruction every time.

Files changed:
- `README.md`
- `CONTRIBUTING.md`
- `CLAUDE.md`
- `DEVELOPMENT.md`
- `DEPLOY.md`
- `.github/pull_request_template.md`
- `.github/ISSUE_TEMPLATE/config.yml`
- `.github/workflows/deploy.yml`
- `docs/AGENT_WORKLOG.md`

What changed:
- Added a prominent "给协作 Agent / 新维护者的第一步" section near the top of `README.md`.
- Added Agent collaboration requirements to `CONTRIBUTING.md`.
- Updated README quick start clone URL from the old `timin_api_test_and_forum` repo to the current `timix_share` repo.
- Updated the old forum cooldown wording so it no longer says 60 seconds.
- Updated `CLAUDE.md` so Claude Code reads `AGENTS.md` and this worklog before editing.
- Updated `DEVELOPMENT.md`, `DEPLOY.md`, and GitHub issue/discussion links from the old repo to `timix_share`.
- Added Agent/worklog checks to the PR template.
- Changed GitHub Pages workflow to read Supabase public config from GitHub Secrets instead of hardcoding a publishable key.

Decisions:
- Put the instruction in README because GitHub and most agents read it first.
- Keep detailed rules in `AGENTS.md` and ongoing context in this worklog to avoid bloating README.
- Also patch `CLAUDE.md` because Claude Code may load it automatically before README.

Verification:
- `npm run build`: not run. Most changes are docs; one GitHub Actions env source was changed and should be verified by the next Pages run.
- `npm run lint`: not run. No application source changed.
- `rg` checks were run for stale old repo names and old cooldown wording across common docs.

Commit/push:
- Commit: not created in this turn.
- Pushed: no.

Follow-ups:
- Commit and push these documentation changes so other agents see them after cloning.
- VPS is now the official deployment path. GitHub Pages is only a manual historical fallback.
- Only configure these repository secrets if you intentionally use the manual GitHub Pages fallback:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 2026-07-03: Mark VPS As Official Deployment Path

Agent:
- Codex

User request:
- Clarify that the project has fully moved to VPS deployment and should not require GitHub Pages Secrets for normal work.

Files changed:
- `.github/workflows/deploy.yml`
- `README.md`
- `CLAUDE.md`
- `DEVELOPMENT.md`
- `DEPLOY.md`
- `docs/AGENT_WORKLOG.md`

What changed:
- Changed GitHub Pages workflow from push-triggered to manual-only `workflow_dispatch`.
- Marked GitHub Pages as historical fallback rather than official deployment.
- Updated README, Claude context, development docs, and deployment docs to make VPS/PM2 the official deployment path.

Decisions:
- Kept the Pages workflow instead of deleting it, so it remains available as a manual fallback.
- Removed the need to configure GitHub Pages Secrets for normal VPS deployments.

Verification:
- `npm run build`: not run, docs/workflow-only change.
- `npm run lint`: not run, docs/workflow-only change.

Commit/push:
- Commit: not created in this turn.
- Pushed: no.

Follow-ups:
- Push these docs/workflow changes.
- Future agents should use `cd ~/timix_share && git pull origin main && rm -rf .next && npm run build && pm2 restart timin` for deploy guidance.

### 2026-07-03: Clarify Local-First Collaboration Flow

Agent:
- Codex

User request:
- Clarify that collaborators/agents should run the site locally, inspect results, push good changes to GitHub, then let VPS pull and deploy.

Files changed:
- `AGENTS.md`
- `README.md`
- `CONTRIBUTING.md`
- `CLAUDE.md`
- `DEVELOPMENT.md`
- `DEPLOY.md`
- `docs/AGENT_WORKLOG.md`

What changed:
- Added a local-first collaboration flow to agent rules and public docs.
- Clarified that collaborators/agents should not directly deploy to VPS unless explicitly authorized.
- Reworded `main` from "auto deploy" to "source branch for VPS pull deployment".

Decisions:
- Keep VPS deployment as the official path, but make GitHub the handoff point between collaborators and server.
- Keep GitHub Pages as manual historical fallback only.

Verification:
- `npm run build`: not run, documentation-only change.
- `npm run lint`: not run, documentation-only change.

Commit/push:
- Commit: not created in this turn.
- Pushed: no.

Follow-ups:
- Commit and push all collaboration documentation updates.

### 2026-07-03: Add Agent Collaboration Memory

Agent:
- Codex

User request:
- Create something future agents can read to understand the project and follow previous agent work.

Files changed:
- `AGENTS.md`
- `docs/AGENT_WORKLOG.md`

What changed:
- Expanded `AGENTS.md` from a Next.js warning into a TiMix-specific agent rule file.
- Added this worklog as shared repository memory.
- Seeded the file with project constraints, architecture notes, recent commits, and historical review findings.

Decisions:
- Put the worklog inside the repo so cloned agents can read it immediately.
- Keep desktop handoff docs separate from repo-native agent memory.

Verification:
- `npm run build`: not run, documentation-only change.
- `npm run lint`: not run, documentation-only change.

Commit/push:
- Commit: not created in this turn.
- Pushed: no.

Follow-ups:
- Future agents should append entries here after meaningful changes.
- Tian can decide whether to commit this documentation immediately.

### 2026-07-05: Community Mobile App Shell

Agent:
- Name/tool: Codex, TiMix_Mibille 子 agent 3

User request:
- Only update the community page mobile experience to feel like a compact Todo-style app/light forum, with a light cyan header, clearer posting entry, smaller typography, and less stacked desktop-card feel.

Files changed:
- `src/app/community/page.tsx`
- `docs/AGENT_WORKLOG.md`

What changed:
- Added a mobile-only light cyan community header with prominent post and GitHub actions.
- Replaced the mobile hub card stack with compact horizontal quick actions for posting, hot topics, ranking, and QQ.
- Kept the existing desktop hero/card layout for tablet/desktop.
- Added page-scoped mobile CSS variables and overrides so the community composer/feed render as compact light message cards without changing shared components globally.

Decisions:
- Did not edit `guides`, `profile`, `stations`, `navbar`, or `mobile-dock`.
- Kept the "分享" naming untouched and did not reuse the share page CSS class for community.
- Scoped mobile visual overrides under the community page root to avoid affecting station detail discussions and other `DiscussionFeed` usages.

Verification:
- `npm run build`: pass
- `npm run lint`: fail on pre-existing `src/components/page-transition.tsx` React refs errors; not caused by this change.
- `npx eslint src/app/community/page.tsx`: pass
- `npx playwright screenshot --viewport-size=390,844 http://localhost:3001/community C:\tmp\timix-community-mobile.png`: pass

Commit/push:
- Commit: not created in this turn.
- Pushed: no.

Follow-ups:
- Full-repo lint still needs the existing `page-transition.tsx` ref-during-render issue fixed by the owner/agent working that file.

### 2026-07-05: Mobile App Profile Page

Agent:
- Name/tool: Codex sub-agent 1

User request:
- Rework only the personal profile page into a lightweight mobile-app-style "我的" page, with smaller typography, clear login/avatar/contribution/private-message/settings entries, and unified "分享" wording.

Files changed:
- `src/app/profile/page.tsx`
- `docs/AGENT_WORKLOG.md`

What changed:
- Replaced the desktop/marketing-style profile layout with a compact mobile "我的" page.
- Added a shallow cyan header, compact profile card, avatar upload entry, four quick actions for 分享/贡献/私信/设置, profile completion, recent activity, and a tighter contribution list.
- Reused existing auth, profile save, avatar upload, toast, and `GlobalInboxModal` systems.
- Renamed personal content labels from 发帖/点赞 style wording toward 分享/喜欢 in this page.

Decisions:
- Kept changes scoped to `src/app/profile/page.tsx` to avoid touching files owned by parallel agents.
- Linked 分享 to `/guides` while keeping the underlying existing discussion storage data model unchanged.
- Opened private messages through the existing global inbox modal instead of inventing a new route.

Verification:
- `npm run lint -- src/app/profile/page.tsx`: pass
- `npm run build`: pass
- `curl.exe -I http://localhost:3001/profile/`: 200 OK
- In-app browser mobile verification: attempted twice, but the browser webview attach timed out before page inspection.

Commit/push:
- Commit: not created in this turn.
- Pushed: no.

Follow-ups:
- A human or another agent can visually inspect `http://localhost:3001/profile/` in the running dev server because automated browser attachment was unavailable in this run.

### 2026-07-05: Share Mobile Sheets Polish

Agent:
- Name/tool: Codex sub agent 4

User request:
- Redo Share area folder/share creation and post detail on mobile to feel like a lightweight app sheet, with smaller fonts and unified "板块/分享" naming. Avoid files owned by other parallel agents.

Files changed:
- `src/components/share-create-modal.tsx`
- `src/components/post-detail-modal.tsx`
- `src/components/edit-panel-modal.tsx`

What changed:
- Changed create folder/share modal to a mobile bottom sheet with compact form spacing, smaller mobile input text, shorter copy, and unified "发布分享 / 分享标题 / 分享正文" labels.
- Changed share detail modal and nested reply modal to bottom-sheet behavior on mobile, with the detail/comment layout stacked vertically and the desktop side-by-side layout preserved at larger breakpoints.
- Lightly synced the edit modal with bottom-sheet mobile behavior and "编辑分享" naming.

Decisions:
- Kept storage APIs and component state unchanged; this is a scoped UI/text pass only.
- Preserved desktop layout through `sm`/`lg` responsive classes so existing large-screen behavior stays familiar.
- Did not touch `/guides`, profile/stations/community pages, navbar, or mobile dock because those are outside this agent's scope and may be owned by other agents.

Verification:
- `npm run build`: pass
- `npm run lint`: fail due existing `src/components/page-transition.tsx` `react-hooks/refs` errors; not introduced by this change. Existing warnings remain.
- Other: `rg` checked target components for old "帖子/项目/Share" UI wording; remaining matches are code identifiers such as `ShareFolder`/`SharedComment`.

Commit/push:
- Commit: not created in this turn.
- Pushed: no.

Follow-ups:
- Another agent should address `page-transition.tsx` lint errors before expecting full `npm run lint` to pass.

### 2026-07-05: Mobile Stations Page Compact App Layout

Agent:
- Name/tool: Codex sub agent 2

User request:
- Only update the stations/ranking page for mobile app-like UI: compact, smaller type, Tomato Todo-like list flow, light app header, keep share module naming untouched and do not edit guides/profile/navbar/mobile-dock.

Files changed:
- `src/app/stations/page.tsx`
- `src/components/stations-board.tsx`
- `src/components/station-monitor-panel.tsx`
- `docs/AGENT_WORKLOG.md`

What changed:
- Added a mobile-only light app header for `/stations` and hid the large desktop hero/step cards on mobile.
- Converted mobile station ranking view into tighter list cards with three key facts: price, multiplier, status.
- Made mobile search/filter controls smaller and horizontally scannable.
- Added mobile monitor cards so realtime monitoring no longer presents as a wide table on phones; desktop table remains.
- Hid the station submission block on mobile to keep the ranking flow focused.

Decisions:
- Kept desktop ranking layout mostly intact while changing mobile breakpoints.
- Changed only stations page and direct dependencies, avoiding guides/profile/navbar/mobile-dock as requested.
- Left existing data loading, auth, edit, history, discussion, and station detail behavior unchanged.

Verification:
- `npm run build`: pass.
- `npm run lint`: fail due existing `src/components/page-transition.tsx` react-hooks/refs errors and other pre-existing warnings outside this task scope.
- Browser check: attempted mobile viewport verification against `http://localhost:3001/stations`, but the in-app browser webview timed out attaching twice; viewport reset attempted afterward.

Commit/push:
- Commit: not created in this turn.
- Pushed: no.

Follow-ups:
- Visually inspect `/stations` on an actual phone or working browser session because automated browser attachment failed.
- Separate agent should handle the existing `page-transition.tsx` lint errors if lint clean is required.

### 2026-07-05: Mobile App Shell Share-First Rewrite

Agent:
- Name/tool: Codex main agent with 4 parallel sub agents

User request:
- Make `D:\github\TiMix_Mibille` the dedicated mobile app version. Use a Tomato Todo-like light mobile UI, remove homepage intro behavior, open directly into the Share experience, shorten "热门有趣项目Share" to "分享", and broadly rework share folders/posts plus profile, stations, community, and mobile modals.

Files changed by main agent:
- `src/app/page.tsx`
- `src/app/guides/page.tsx`
- `src/app/globals.css`
- `src/components/mobile-dock.tsx`
- `src/components/navbar.tsx`
- `src/components/page-transition.tsx`
- `src/components/pwa-install-prompt.tsx`

Parallel sub-agent areas:
- Profile mobile app page: `src/app/profile/page.tsx`
- Stations mobile ranking flow: `src/app/stations/page.tsx`, `src/components/stations-board.tsx`, `src/components/station-monitor-panel.tsx`
- Community mobile message-flow shell: `src/app/community/page.tsx`
- Share creation/detail/edit sheets: `src/components/share-create-modal.tsx`, `src/components/post-detail-modal.tsx`, `src/components/edit-panel-modal.tsx`

What changed:
- `/` now renders the Share app directly instead of a desktop-style introduction homepage.
- Unified user-facing module naming to `分享` across main nav/mobile dock/quick panel/share breadcrumbs.
- Rebuilt the Share page as a mobile-first app surface with a light cyan top bar, compact board chips, hot shares, folder cards, and latest share list.
- Fixed the mobile dock into a stable 5-column tab bar and renamed first tab to `分享`.
- Added a prominent PWA install callout and kept the existing small install button.
- Fixed `page-transition.tsx` so it no longer reads/writes refs during render.

Verification:
- `npm run build`: pass.
- `npm run lint`: pass with warnings only; no errors remain. Warnings are mostly existing unused variables / `<img>` optimization warnings, plus 3 warnings in `src/app/guides/page.tsx` after the share rewrite.
- Targeted `npx eslint src/app/guides/page.tsx src/components/page-transition.tsx`: pass with warnings only.

Notes:
- In-app browser automation became unstable during this run and timed out attaching to the local page after earlier successful checks. The dev preview remains available at `http://localhost:3001/`.
- Existing unrelated dirty worktree changes in docs and `.github` were not reverted.

### 2026-07-05: Mobile Dual Theme App Polish

Agent:
- Name/tool: Codex main agent

User request:
- Keep the useful white/green mobile look, but also add a black high-tech TiMix theme. Open the side browser live so Tian can watch and click while changes are made.

Files changed:
- `src/app/globals.css`
- `src/app/guides/page.tsx`
- `src/app/community/page.tsx`
- `src/components/mobile-theme-toggle.tsx`
- `src/components/mobile-dock.tsx`
- `src/components/navbar.tsx`
- `src/components/register-counter.tsx`
- `docs/AGENT_WORKLOG.md`

What changed:
- Added a mobile-only theme toggle component backed by `localStorage` key `timix-mobile-theme-v1`.
- Reworked mobile global CSS into two real app themes: default white/green `mint`, and switchable black/cyber `cyber` via `html[data-mobile-theme="cyber"]`.
- Added theme toggle buttons to the Share and Community mobile headers.
- Updated the bottom mobile dock to use mobile theme variables instead of fixed dark colors.
- Replaced the community page's hardcoded light mobile CSS with shared mobile theme variables.
- Fixed mobile navbar logo contrast in the white/green theme.
- Moved and shortened the mobile registration counter so it no longer sits on top of primary action buttons.
- Opened and refreshed the in-app browser at `http://localhost:3001/` for live review.

Decisions:
- White/green remains the default mobile theme because Tian said that direction was still good.
- Black/cyber is a user-selectable mobile app theme, not a replacement.
- Kept this pass focused on app shell/theme polish rather than rewriting every page again.

Verification:
- `npm run build`: pass.
- Targeted `npx eslint src/app/guides/page.tsx src/app/community/page.tsx src/components/mobile-theme-toggle.tsx src/components/mobile-dock.tsx src/components/navbar.tsx src/components/register-counter.tsx`: pass with 4 warnings only. Warnings are existing hook dependency / `<img>` optimization warnings.
- Playwright screenshots were generated for `/` and `/community` in both mint and cyber themes; visual review found and fixed navbar logo contrast and mobile registration counter overlap.
- In-app browser live preview opened/refreshed at `http://localhost:3001/`.

Commit/push:
- Commit: not created in this turn.
- Pushed: no.

Follow-ups:
- Continue visual QA on `/stations`, `/profile`, and modal sheets in both mobile themes.
- Consider moving the theme toggle into a shared top app shell if all mobile pages should expose it consistently.

### 2026-07-05: Mobile Theme Coverage And PWA Install Entry

Agent:
- Name/tool: Codex main agent

User request:
- Continue improving the mobile app while keeping the side browser open for live review.

Files changed:
- `src/app/stations/page.tsx`
- `src/app/profile/page.tsx`
- `src/app/guides/page.tsx`
- `src/components/station-monitor-panel.tsx`
- `src/components/pwa-install-prompt.tsx`
- `src/app/globals.css`
- `docs/AGENT_WORKLOG.md`

What changed:
- Added the shared mobile theme toggle to `/stations` and `/profile`, so Share, Community, Stations, and Profile can all switch between mint and cyber themes.
- Improved mobile stations header text contrast and monitor panel spacing after screenshot review.
- Made profile primary buttons follow the mobile theme gradient.
- Restyled `PwaInstallCallout` to follow mobile theme variables instead of fixed dark styling.
- Mounted `PwaInstallCallout` in the Share page sidebar/down-page area so the mobile app install guidance is actually reachable without taking over the first screen.
- Refreshed the in-app browser live preview at `http://localhost:3001/`.

Decisions:
- Kept Share as the first screen and avoided a marketing-style app download block above core content.
- Kept PWA guidance visible but secondary, placed after hot content in the Share sidebar/mobile flow.

Verification:
- `npm run build`: pass.
- Targeted `npx eslint src/app/guides/page.tsx src/app/stations/page.tsx src/app/profile/page.tsx src/components/station-monitor-panel.tsx src/components/pwa-install-prompt.tsx src/components/mobile-theme-toggle.tsx`: pass with 3 existing warnings in `src/app/guides/page.tsx`.
- Playwright mobile screenshots for `/stations` and `/profile` in mint/cyber were generated and visually reviewed.

Commit/push:
- Commit: not created in this turn.
- Pushed: no.

Follow-ups:
- Continue modal-sheet QA in both themes, especially share creation/detail and auth/login flows.
- Consider replacing the remaining `<img>` tags in `src/app/guides/page.tsx` if image optimization warnings matter.
### 2026-07-05: Mobile Share And Ranking Density Pass

Agent:
- Name/tool: Codex main agent

User request:
- Continue making the mobile app feel finished: simplify the home/share screen, make the ranking page much thinner like a Weibo feed, and keep a live preview open for Tian to inspect.

Files changed:
- `src/app/guides/page.tsx`
- `src/app/stations/page.tsx`
- `src/components/stations-board.tsx`
- `src/app/globals.css`
- `docs/AGENT_WORKLOG.md`

What changed:
- Compressed the Share mobile header, action chips, folder rows, and share post rows so the first screen shows more useful content with less explanatory copy.
- Hid the desktop/sidebar Share recommendation/install stack on mobile so the home screen stays focused on the actual Share feed.
- Reduced the Stations mobile header, page spacing, filter controls, table header, and station rows.
- Converted mobile station rows into roughly 51px feed rows with rank, name, badge/note, multiplier/status, and compact open/discussion icon actions.
- Added mobile CSS overrides to keep Share and Stations rows light in mint theme and restrained in cyber theme.

Decisions:
- Kept desktop layouts intact through responsive classes.
- Kept `/` as Share and the user-facing module name as `分享`.
- Used a clean static preview on port `3002` because the existing `3001` origin was serving stale PWA chunks from an old Service Worker cache.

Verification:
- `npm run build`: pass.
- Targeted `npx eslint src\app\guides\page.tsx src\app\stations\page.tsx src\components\stations-board.tsx src\app\globals.css`: pass with warnings only. CSS is ignored by ESLint; existing Share warnings remain for hook dependencies and `<img>` optimization.
- `curl.exe -I http://localhost:3002/`: 200 OK.
- In-app browser mobile viewport check on `http://localhost:3002/`: Share loaded with no error; folder rows were about 58px and share rows about 81px.
- In-app browser mobile viewport check on `http://localhost:3002/stations/`: Stations loaded with no error; mobile station rows were about 51px.

Commit/push:
- Commit: not created in this turn.
- Pushed: no.

Follow-ups:
- Continue mobile QA for auth/login, create/edit/detail sheets, and actual install flow.
- If using `localhost:3001` again, clear/unregister the old PWA Service Worker or restart on a clean origin to avoid stale chunk errors.
### 2026-07-05: Premium Cyber Mobile Theme

Agent:
- Name/tool: Codex main agent

User request:
- Keep the white/green mobile theme, but upgrade the black mobile theme into a premium Linear/Vercel-style tech aesthetic with absolute black, translucent white borders, glass panels, subdued typography, and no harsh cyan/purple gradients.

Files changed:
- `src/app/globals.css`
- `src/app/guides/page.tsx`
- `docs/AGENT_WORKLOG.md`

What changed:
- Replaced the mobile `cyber` theme tokens with black/zinc values: `#000` root surface, `rgba(255,255,255,0.025)` panels, `rgba(255,255,255,0.06-0.075)` borders, zinc-muted secondary text, and frosted black headers/dock.
- Removed the visual effect of high-saturation cyan/magenta gradients in the black theme by overriding primary buttons to a monochrome premium white style.
- Added black-theme glass overrides for Share, Stations, Community, Profile, inputs, headers, dock, list rows, and panels.
- Added `mobile-primary-action` and `mobile-secondary-action` classes on Share actions so `新建板块` remains the high-contrast primary button while `板块/分享` chips stay subtle glass controls.

Decisions:
- White/green `mint` theme was intentionally left unchanged because Tian said it was already good.
- The black theme now prioritizes restraint over brand color: black, zinc, white translucency, and only minimal glow.

Verification:
- `npm run build`: pass.
- Targeted `npx eslint src\app\guides\page.tsx src\app\globals.css`: pass with warnings only. CSS is ignored by ESLint; existing Share warnings remain.
- In-app browser on `http://localhost:3002/stations/`: black theme computed values show pure black body, frosted black header, `rgba(255,255,255,0.024)` rows, `rgba(255,255,255,0.06)` borders, and white primary buttons.
- In-app browser on `http://localhost:3002/`: `新建板块` is white primary, while `板块` and `分享` are subtle glass chips.

Commit/push:
- Commit: not created in this turn.
- Pushed: no.

Follow-ups:
- Continue checking modal sheets and auth/install flows in the premium black theme.
### 2026-07-05: Deep Zinc Premium Dark Correction

Agent:
- Name/tool: Codex main agent with attempted parallel sub-agents

User request:
- Continue the premium Linear/Vercel mobile dark theme, but correct the previous pure-black attempt because `#000000` made the UI feel flat and broken. Use deep off-blacks, zinc grays, subtle depth, translucent borders, frosted glass, and a slight texture/noise layer.

Files changed:
- `src/app/globals.css`

What changed:
- Replaced mobile `cyber` root/background tokens from pure black to deep zinc/off-black values: `#09090b`, `#0f0f14`, and `#0b0b0f`.
- Changed `--mobile-app-surface` to a very restrained dark radial spotlight plus deep zinc linear background.
- Added a mobile-only `html[data-mobile-theme="cyber"]::before` noise overlay using inline SVG fractal noise at ~3.2% opacity.
- Added higher-specificity final overrides for mobile headers and Share primary/secondary actions so Tailwind/mint classes cannot pull the cyber theme back to transparent or mint colors.
- Removed the old global `--color-bg: #000000` compatibility token by changing it to `#09090b`.
- Attempted four parallel sub-agents for globals/share/stations/release analysis; they did not complete in time and were shut down to avoid delayed conflicting writes.

Decisions:
- White/green `mint` theme remains unchanged.
- The black theme uses depth through off-black layering, faint zinc spotlight, translucent borders, inner glow, and noise rather than saturated color.

Verification:
- `Select-String` check for `#000000`, `background: #000`, and pure-black mobile cyber root/surface tokens: no matches after correction.
- `npm run build`: pass.
- In-app browser verification was attempted, but the browser webview attach timed out after the CSS changes. Earlier computed-style verification confirmed the theme switch path; final validation used build and CSS inspection.

Commit/push:
- Commit: not created in this turn.
- Pushed: no.

Follow-ups:
- Visually inspect `http://localhost:3002/` in the side browser after refresh.
- Continue the actual downloadable app path: Capacitor Android or TWA; current machine lacks the confirmed Android/JDK/Capacitor toolchain.
### 2026-07-05: Capacitor Android App Scaffold

Agent:
- Name/tool: Codex main agent

User request:
- Make the mobile version into a real downloadable app that can be uploaded to GitHub Releases, not only a mobile web preview.

Files changed:
- `package.json`
- `package-lock.json`
- `capacitor.config.ts`
- `android/`
- `docs/MOBILE_RELEASE.md`
- `docs/AGENT_WORKLOG.md`

What changed:
- Installed Capacitor dependencies: `@capacitor/core`, `@capacitor/cli`, and `@capacitor/android`.
- Added Capacitor config with app id `com.timix.mobile`, app name `TiMix`, and webDir `out`.
- Added npm scripts:
  - `mobile:build`: `next build && cap sync android`
  - `mobile:android`: build/sync and open Android project
  - `mobile:apk:debug`: build/sync then `gradlew assembleDebug`
  - `mobile:apk:release`: build/sync then `gradlew assembleRelease`
- Generated the native Android project under `android/`.
- Added `docs/MOBILE_RELEASE.md` with local and GitHub Release APK build instructions.

Decisions:
- Use Capacitor Android because the app already static-exports to `out/` and needs a native WebView wrapper for downloadable APK releases.
- Keep PWA behavior and themes inside the wrapped web bundle.

Verification:
- `npm run mobile:build`: pass as part of `mobile:apk:debug` before Gradle starts.
- `npx cap add android`: pass.
- `npm run mobile:apk:debug`: fails only because local machine has no Java/JDK available: `JAVA_HOME is not set and no 'java' command could be found in your PATH`.
- The Android project and web asset sync were generated successfully before the Java failure.

Commit/push:
- Commit: not created in this turn.
- Pushed: no.

Follow-ups:
- Install JDK 17+ and Android SDK locally, then rerun `npm run mobile:apk:debug` to produce `android/app/build/outputs/apk/debug/app-debug.apk`.
- Add release signing config and GitHub Actions if Tian wants automatic signed APK/AAB uploads to GitHub Releases.
### 2026-07-05: Black Purple Cyber Theme Correction

Agent:
- Name/tool: Codex main agent

User request:
- The dark theme should not be pure black or neutral gray; change it to a black-purple, tech-feeling mobile UI while keeping the white/green theme.

Files changed:
- `src/app/globals.css`
- `docs/AGENT_WORKLOG.md`

What changed:
- Reworked mobile `cyber` tokens from neutral deep zinc into a black-purple palette.
- Added deep purple-black root surface with restrained violet radial spotlight layers.
- Changed glass panels/list rows to subtle violet glass: low-opacity violet fills, lavender translucent borders, and purple-tinted shadows.
- Changed cyber primary buttons from monochrome white to restrained violet gradient/glow buttons.
- Kept secondary chips as purple glass controls.

Decisions:
- White/green `mint` theme remains unchanged.
- The cyber theme now prioritizes black-purple tech atmosphere over Linear-style neutral monochrome.

Verification:
- `npm run build`: pass.
- Targeted `npx eslint src\app\globals.css src\app\guides\page.tsx`: pass with warnings only. CSS is ignored by ESLint; existing Share warnings remain.
- `curl.exe -I http://localhost:3002/`: 200 OK after rebuild.

Commit/push:
- Commit: not created in this turn.
- Pushed: no.

Follow-ups:
- Visually inspect `http://localhost:3002/` and switch to the dark theme if needed.
### 2026-07-12: Stability Audit And Native Alert Cleanup

Agent:
- Name/tool: Codex main agent

User request:
- Perform another full project inspection and implement safe, verifiable improvements.

Files changed:
- `src/app/globals.css`
- `src/app/guides/page.tsx`
- `src/app/profile/page.tsx`
- `src/components/selection-comment-layer.tsx`
- `src/components/stations-board.tsx`
- `src/lib/share-storage.ts`
- `src/lib/use-back-button-close.ts`
- `src/lib/use-post-image-upload.tsx`
- `docs/AGENT_WORKLOG.md`

What changed:
- Removed every remaining `alert()` / `window.alert()` call from `src/`.
  - Station deletion, selection comment failures, Share folder debug output, Share admin failures, and post image upload errors now use the existing Toast flow or throw errors back to their UI caller.
- Removed Share folder creation debug popups from the storage layer; errors are still logged and propagated to callers.
- Corrected the `stations-board` save callbacks to depend on the full authenticated user object, allowing the React compiler/linter to preserve their memoization.
- Fixed the Share folder-contributor effect so it derives the active folder inside the effect instead of closing over a newly-created render value; the validated folder id is captured before async work starts.
- Fixed mobile modal scroll penetration: when `html[data-scroll-locked]` is active, the mobile page scroll shells are now hidden/untouchable while portal dialogs retain their own scroll behavior.
- Removed unused Profile/Navbar and back-button event parameter code.

Decisions:
- Native `window.confirm()` calls were left intact for destructive actions because this pass only removed forbidden native alerts; replacing confirmation UX should be a dedicated, tested modal migration.
- Existing `next/image` lint warnings were not mass-converted because many images are remote/user-generated and Next static export uses unoptimized images. They are performance follow-ups, not compile failures.

Verification:
- `rg` scan for `alert(` and `window.alert(` in `src/`: no matches.
- `npm run lint`: 0 errors; remaining warnings are existing image optimization and a small number of pre-existing hook warnings outside this change set.
- `npm run build`: pass; all App Router routes generated successfully.

Commit/push:
- Commit: see Git history.
- Pushed: see remote branch.

Follow-ups:
- Replace the remaining native `window.confirm()` prompts with a shared accessible confirmation dialog in a separate UI migration.
- Consider a deliberate remote-image strategy before converting the remaining `<img>` warnings to `next/image`.
