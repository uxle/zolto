/**
 * Zolto Phase 3 Test Fixtures — Native Block Directives
 *
 * Each fixture is:  { input, contains?, notContains?, description }
 */

// ─── Embed ────────────────────────────────────────────────────────────────────

export const embedFixtures = [
  { description: 'Image embed with alt', input: '@embed image src="pic.png" alt="A photo"\n@/embed',
    contains: ['zl-embed-image', 'src="pic.png"', 'alt="A photo"'] },
  { description: 'Image embed with caption from body', input: '@embed image src="a.jpg"\nA lovely photo.\n@/embed',
    contains: ['zl-embed-cap', 'A lovely photo.'] },
  { description: 'YouTube embed resolves video ID', input: '@embed youtube src="https://youtu.be/dQw4w9WgXcQ"\n@/embed',
    contains: ['youtube-nocookie.com/embed/dQw4w9WgXcQ'] },
  { description: 'YouTube embed from watch URL', input: '@embed youtube src="https://www.youtube.com/watch?v=dQw4w9WgXcQ"\n@/embed',
    contains: ['dQw4w9WgXcQ'] },
  { description: 'Vimeo embed resolves video ID', input: '@embed vimeo src="https://vimeo.com/123456789"\n@/embed',
    contains: ['player.vimeo.com/video/123456789'] },
  { description: 'Video embed', input: '@embed video src="movie.mp4" width=640 height=360\n@/embed',
    contains: ['<video', 'src="movie.mp4"'] },
  { description: 'Audio embed', input: '@embed audio src="song.mp3"\n@/embed',
    contains: ['<audio', 'controls', 'src="song.mp3"'] },
  { description: 'Iframe embed generic', input: '@embed iframe src="https://example.com/widget"\n@/embed',
    contains: ['zl-embed-iframe', '<iframe', 'src="https://example.com/widget"'] },
  { description: 'Figma embed', input: '@embed figma src="https://figma.com/file/abc"\n@/embed',
    contains: ['zl-embed-figma'] },
  { description: 'Codepen embed', input: '@embed codepen src="https://codepen.io/x/pen/y"\n@/embed',
    contains: ['zl-embed-codepen'] },
  { description: 'Embed image has lazy loading by default', input: '@embed image src="x.png"\n@/embed',
    contains: ['loading="lazy"'] },
];

// ─── Collapse ─────────────────────────────────────────────────────────────────

export const collapseFixtures = [
  { description: 'Basic collapse with title', input: '@collapse title="FAQ"\nAnswer text.\n@/collapse',
    contains: ['<details', 'zl-collapse', 'FAQ', 'Answer text.'] },
  { description: 'Collapse defaults to closed', input: '@collapse title="Hidden"\nSecret.\n@/collapse',
    notContains: [' open>'] },
  { description: 'Collapse with open=true', input: '@collapse title="Visible" open=true\nShown by default.\n@/collapse',
    contains: [' open>'] },
  { description: 'Collapse with nested markdown', input: '@collapse title="Details"\n**Bold** and *italic* text.\n@/collapse',
    contains: ['<strong>Bold</strong>', '<em>italic</em>'] },
  { description: 'Collapse with nested list', input: '@collapse title="Items"\n- One\n- Two\n@/collapse',
    contains: ['<ul>', '<li>One</li>'] },
  { description: 'Multiple collapses render independently', input: '@collapse title="A"\nBody A.\n@/collapse\n\n@collapse title="B"\nBody B.\n@/collapse',
    contains: ['Body A.', 'Body B.'] },
];

// ─── Tabs ─────────────────────────────────────────────────────────────────────

export const tabsFixtures = [
  { description: 'Two tabs with labels', input: '@tabs\n@tab label="First"\nContent one.\n@/tab\n@tab label="Second"\nContent two.\n@/tab\n@/tabs',
    contains: ['zl-tabs', 'First', 'Second', 'Content one.', 'Content two.'] },
  { description: 'First tab is visible, others hidden', input: '@tabs\n@tab label="A"\nAAA\n@/tab\n@tab label="B"\nBBB\n@/tab\n@/tabs',
    contains: ['aria-selected="true"', 'aria-selected="false"', 'hidden'] },
  { description: 'Tab with markdown heading inside', input: '@tabs\n@tab label="Docs"\n## Section Title\nBody.\n@/tab\n@/tabs',
    contains: ['<h2', 'Section Title'] },
  { description: 'Tabs have proper ARIA roles', input: '@tabs\n@tab label="X"\nY\n@/tab\n@/tabs',
    contains: ['role="tablist"', 'role="tab"', 'role="tabpanel"'] },
  { description: 'Tab with icon attribute', input: '@tabs\n@tab label="Home" icon=house\nWelcome.\n@/tab\n@/tabs',
    contains: ['house', 'Home'] },
];

// ─── Cards ────────────────────────────────────────────────────────────────────

export const cardFixtures = [
  { description: 'Basic card with title', input: '@card title="Feature"\nDescription text.\n@/card',
    contains: ['zl-card', 'Feature', 'Description text.'] },
  { description: 'Card with icon', input: '@card title="Fast" icon=bolt\nSpeed matters.\n@/card',
    contains: ['zl-card-icon', 'bolt', 'Fast'] },
  { description: 'Card with variant primary', input: '@card primary title="Hero Card"\nBody.\n@/card',
    contains: ['zl-card-primary'] },
  { description: 'Card with description attribute', input: '@card title="X" description="A short blurb"\n@/card',
    contains: ['zl-card-desc', 'A short blurb'] },
  { description: 'Card with href becomes a link', input: '@card title="Click me" href="/page"\n@/card',
    contains: ['<a class="zl-card', 'href="/page"'] },
  { description: 'Card with image', input: '@card title="Pic" img="photo.jpg"\n@/card',
    contains: ['zl-card-img', 'src="photo.jpg"'] },
  { description: 'Card with markdown body', input: '@card title="Rich"\n**Bold** text and a [link](https://x.com).\n@/card',
    contains: ['<strong>Bold</strong>', 'href="https://x.com"'] },
  { description: 'Card-group with 2 columns', input: '@card-group cols=2\n@card title="A"\nAAA\n@/card\n@card title="B"\nBBB\n@/card\n@/card-group',
    contains: ['zl-card-group', 'zl-cg-2', 'AAA', 'BBB'] },
  { description: 'Card-group default is 3 columns', input: '@card-group\n@card title="A"\n@/card\n@/card-group',
    contains: ['zl-cg-3'] },
];

// ─── Steps ────────────────────────────────────────────────────────────────────

export const stepsFixtures = [
  { description: 'Two steps with titles', input: '@steps\n@step title="Install"\nRun the installer.\n@/step\n@step title="Configure"\nEdit the config.\n@/step\n@/steps',
    contains: ['zl-steps', 'Install', 'Configure', 'Run the installer.'] },
  { description: 'Steps show automatic numbering', input: '@steps\n@step title="One"\nA\n@/step\n@step title="Two"\nB\n@/step\n@/steps',
    contains: ['zl-step-marker'] },
  { description: 'Step with icon overrides number', input: '@steps\n@step title="Done" icon=check\nFinished.\n@/step\n@/steps',
    contains: ['check', 'Done'] },
  { description: 'Step with nested code block', input: '@steps\n@step title="Run"\n```bash\nnpm install\n```\n@/step\n@/steps',
    contains: ['language-bash', 'npm install'] },
];

// ─── Columns ──────────────────────────────────────────────────────────────────

export const columnsFixtures = [
  { description: 'Two-column layout', input: '@columns\n@column\nLeft content.\n@/column\n@column\nRight content.\n@/column\n@/columns',
    contains: ['zl-columns', 'zl-column', 'Left content.', 'Right content.'] },
  { description: 'Column with fixed width', input: '@columns\n@column width=30%\nNarrow.\n@/column\n@column\nWide.\n@/column\n@/columns',
    contains: ['flex:0 0 30%'] },
  { description: 'Columns with custom gap', input: '@columns gap=2rem\n@column\nA\n@/column\n@/columns',
    contains: ['gap:2rem'] },
  { description: 'Column with nested markdown', input: '@columns\n@column\n### Heading\n- List item\n@/column\n@/columns',
    contains: ['<h3', '<ul>', '<li>List item</li>'] },
];

// ─── Badge ────────────────────────────────────────────────────────────────────

export const badgeFixtures = [
  { description: 'Success badge', input: '@badge success\nDone\n@/badge', contains: ['zl-badge-success', 'Done'] },
  { description: 'Warning badge', input: '@badge warning\nBeta\n@/badge', contains: ['zl-badge-warning'] },
  { description: 'Danger badge', input: '@badge danger\nDeprecated\n@/badge', contains: ['zl-badge-danger'] },
  { description: 'Info badge', input: '@badge info\nNew\n@/badge', contains: ['zl-badge-info'] },
  { description: 'Neutral badge (default)', input: '@badge\nDefault\n@/badge', contains: ['zl-badge-neutral'] },
  { description: 'Primary badge', input: '@badge primary\nMain\n@/badge', contains: ['zl-badge-primary'] },
  { description: 'Secondary badge', input: '@badge secondary\nAlt\n@/badge', contains: ['zl-badge-secondary'] },
  { description: 'Pill-shaped badge', input: '@badge success pill\nOK\n@/badge', contains: ['zl-badge-pill'] },
  { description: 'Outline badge', input: '@badge danger outline\nWarn\n@/badge', contains: ['zl-badge-outline'] },
  { description: 'Badge with icon', input: '@badge success icon=check\nVerified\n@/badge', contains: ['check', 'Verified'] },
];

// ─── Tag ──────────────────────────────────────────────────────────────────────

export const tagFixtures = [
  { description: 'Basic tag', input: '@tag\nJavaScript\n@/tag', contains: ['zl-tag', 'JavaScript'] },
  { description: 'Tag with color', input: '@tag color=#6366f1\nIndigo\n@/tag', contains: ['color:#6366f1', 'Indigo'] },
  { description: 'Tag with icon', input: '@tag icon=code\nDev\n@/tag', contains: ['code', 'Dev'] },
  { description: 'Tag with href becomes a link', input: '@tag href="/tags/js"\nJS\n@/tag', contains: ['<a class="zl-tag"', 'href="/tags/js"'] },
  { description: 'Tag without href is a span', input: '@tag\nStatic\n@/tag', contains: ['<span class="zl-tag"'] },
];

// ─── Alert ────────────────────────────────────────────────────────────────────

export const alertFixtures = [
  { description: 'Info alert (default)', input: '@alert\nInformation.\n@/alert', contains: ['zl-alert-info', 'Information.'] },
  { description: 'Success alert', input: '@alert success\nAll good.\n@/alert', contains: ['zl-alert-success'] },
  { description: 'Warning alert', input: '@alert warning\nHeads up.\n@/alert', contains: ['zl-alert-warning'] },
  { description: 'Danger alert', input: '@alert danger\nCritical.\n@/alert', contains: ['zl-alert-danger'] },
  { description: 'Alert with title', input: '@alert warning title="Careful"\nProceed with caution.\n@/alert',
    contains: ['zl-alert-title', 'Careful'] },
  { description: 'Alert with dismiss button', input: '@alert info dismissible\nClosable.\n@/alert',
    contains: ['zl-alert-close', 'aria-label="Dismiss"'] },
  { description: 'Alert without dismissible has no close button', input: '@alert info\nStatic.\n@/alert',
    notContains: ['<button class="zl-alert-close"'] },
  { description: 'Alert has ARIA role', input: '@alert danger\nX\n@/alert', contains: ['role="alert"'] },
  { description: 'Alert with nested markdown', input: '@alert info\n**Bold** message with a [link](https://x.com).\n@/alert',
    contains: ['<strong>Bold</strong>', 'href="https://x.com"'] },
];

// ─── Timeline ─────────────────────────────────────────────────────────────────

export const timelineFixtures = [
  { description: 'Timeline with two events', input: '@timeline\n@event title="Launch"\nInitial release.\n@/event\n@event title="Update"\nBug fixes.\n@/event\n@/timeline',
    contains: ['zl-timeline', 'Launch', 'Update', 'Initial release.'] },
  { description: 'Event with date', input: '@timeline\n@event title="Milestone" date="2025-06-01"\nDetails.\n@/event\n@/timeline',
    contains: ['zl-event-date', '2025-06-01'] },
  { description: 'Event with icon', input: '@timeline\n@event title="Deploy" icon=rocket\nShipped.\n@/event\n@/timeline',
    contains: ['Deploy'] },
  { description: 'Event with nested markdown', input: '@timeline\n@event title="Note"\n**Important** update.\n@/event\n@/timeline',
    contains: ['<strong>Important</strong>'] },
];

// ─── Progress ─────────────────────────────────────────────────────────────────

export const progressFixtures = [
  { description: 'Basic progress bar', input: '@progress value=50\n@/progress',
    contains: ['zl-progress', 'width:50%'] },
  { description: 'Progress with label', input: '@progress value=30 label="Uploading"\n@/progress',
    contains: ['zl-progress-label', 'Uploading'] },
  { description: 'Progress with percent display', input: '@progress value=75 showPercent\n@/progress',
    contains: ['zl-progress-pct', '75%'] },
  { description: 'Progress with custom max', input: '@progress value=5 max=10\n@/progress',
    contains: ['width:50%'] },
  { description: 'Progress with color variant', input: '@progress value=20 color=danger\n@/progress',
    contains: ['zl-pb-danger'] },
  { description: 'Progress has ARIA attributes', input: '@progress value=40 max=100\n@/progress',
    contains: ['role="progressbar"', 'aria-valuenow="40"', 'aria-valuemax="100"'] },
];

// ─── Avatar ───────────────────────────────────────────────────────────────────

export const avatarFixtures = [
  { description: 'Avatar with image src', input: '@avatar src="me.jpg" alt="Me"\n@/avatar',
    contains: ['zl-avatar', 'src="me.jpg"', 'alt="Me"'] },
  { description: 'Avatar with initials', input: '@avatar initials=JD\n@/avatar',
    contains: ['zl-avatar-initials', 'JD'] },
  { description: 'Avatar initials truncated to 2 chars', input: '@avatar initials=ABCDEF\n@/avatar',
    contains: ['AB'], notContains: ['ABCDEF'] },
  { description: 'Avatar with fallback icon', input: '@avatar\n@/avatar',
    contains: ['person'] },
  { description: 'Avatar with status indicator', input: '@avatar initials=AB status=online\n@/avatar',
    contains: ['zl-avatar-status', 'zl-st-online'] },
  { description: 'Avatar size variants', input: '@avatar initials=XL size=xl\n@/avatar',
    contains: ['zl-av-xl'] },
];

// ─── Icon ─────────────────────────────────────────────────────────────────────

export const iconFixtures = [
  { description: 'Basic icon from body', input: '@icon\ncheck_circle\n@/icon',
    contains: ['material-symbols-rounded', 'check_circle'] },
  { description: 'Icon with positional name', input: '@icon star\n@/icon',
    contains: ['star'] },
  { description: 'Icon with custom size', input: '@icon home size=32\n@/icon',
    contains: ['font-size:32px'] },
  { description: 'Icon with color', input: '@icon warning color=danger\n@/icon',
    contains: ['zl-icon-danger'] },
  { description: 'Icon with accessible label', input: '@icon settings label="Settings"\n@/icon',
    contains: ['aria-label', 'zl-icon-label', 'Settings'] },
  { description: 'Icon without label is aria-hidden', input: '@icon check\n@/icon',
    contains: ['aria-hidden="true"'] },
];

// ─── Cross-directive & nesting stress tests ───────────────────────────────────

export const nestingFixtures = [
  { description: 'Card inside a column', input: '@columns\n@column\n@card title="Nested"\nInside a column.\n@/card\n@/column\n@/columns',
    contains: ['zl-columns', 'zl-card', 'Nested'] },
  { description: 'Alert inside a tab', input: '@tabs\n@tab label="Warnings"\n@alert warning\nCheck this.\n@/alert\n@/tab\n@/tabs',
    contains: ['zl-tab-panel', 'zl-alert-warning'] },
  { description: 'Steps inside a collapse', input: '@collapse title="How To"\n@steps\n@step title="Do this"\nFirst.\n@/step\n@/steps\n@/collapse',
    contains: ['zl-collapse', 'zl-steps', 'Do this'] },
  { description: 'Badge and tag combined in the same paragraph flow', input: '@badge success\nLive\n@/badge\n\n@tag\nv2\n@/tag',
    contains: ['zl-badge-success', 'zl-tag'] },
  { description: 'Card-group inside a tab', input: '@tabs\n@tab label="Products"\n@card-group\n@card title="A"\n@/card\n@/card-group\n@/tab\n@/tabs',
    contains: ['zl-tab-panel', 'zl-card-group'] },
];

// ─── Attribute parsing edge cases ──────────────────────────────────────────────

export const attributeFixtures = [
  { description: 'Boolean flag without value', input: '@progress value=10 showPercent\n@/progress',
    contains: ['zl-progress-pct'] },
  { description: 'Quoted string with spaces', input: '@card title="Multi Word Title"\n@/card',
    contains: ['Multi Word Title'] },
  { description: 'Single-quoted string', input: "@alert info title='Single Quotes'\nBody\n@/alert",
    contains: ['Single Quotes'] },
  { description: 'Numeric attribute parsed as number', input: '@progress value=42\n@/progress',
    contains: ['aria-valuenow="42"'] },
  { description: 'Positional first argument (no key=)', input: '@alert danger\nCritical issue.\n@/alert',
    contains: ['zl-alert-danger'] },
  { description: 'Hyphenated directive name (card-group)', input: '@card-group\n@card title="X"\n@/card\n@/card-group',
    contains: ['zl-card-group'] },
];
