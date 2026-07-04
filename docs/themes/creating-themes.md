# Creating Themes

A Zolto theme is a CSS file that overrides design tokens for a named `data-theme` attribute.

## Template

```css
/* css/themes/my-theme.css */
[data-theme="my-theme"] {
  /* Backgrounds */
  --bg-base:  #1a1a2e;
  --bg-app:   #16213e;
  --bg-panel: #0f3460;

  /* Text */
  --text-main: #e0e0e0;
  --text-body: #a8a8b3;
  --text-mute: #6b6b7a;

  /* Brand */
  --brand-a: #e94560;
  --brand-b: #f5a623;

  /* Prose */
  --prose-bg:   #16213e;
  --prose-text: #c0c0c0;
  --prose-head: #e0e0e0;
}
```

## Registering the theme

1. Add the CSS file to `css/themes/`
2. Add a `<link>` in `index.html`
3. Add the name to the `THEMES` array in the Studio script

## Phase 5

Theme registration will be automated via a theme registry API.
