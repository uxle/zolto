# CSS Variables Reference

All Zolto design tokens are defined in `css/base/variables.css` and
currently also inlined in `index.html`'s `<style>` block (Phase 2).

## Token categories

| Prefix | Tokens | Example |
| :----- | :----- | :------ |
| `--bg-*` | Backgrounds | `--bg-base`, `--bg-app`, `--bg-panel` |
| `--text-*` | Text colours | `--text-main`, `--text-body`, `--text-mute` |
| `--border-*` | Borders | `--border-base`, `--border-heavy` |
| `--intent-*` | Semantic colours | `--intent-primary`, `--intent-danger` |
| `--brand-*` | Brand gradient | `--brand-a` (#60a5fa), `--brand-b` (#a78bfa) |
| `--zl-*` | Zolto UI | `--zl-note`, `--zl-warning`, `--zl-kbd-bg` |
| `--r*` | Border radii | `--r` (8px), `--r-sm` (5px), `--r-xl` (16px) |
| `--shadow-*` | Box shadows | `--shadow-sm`, `--shadow-md`, `--shadow-lg` |
| `--font-*` | Font stacks | `--font-sans`, `--font-mono` |

## Switching themes at runtime

```javascript
document.documentElement.dataset.theme = 'light';  // or dark, midnight, oled
```

No JavaScript re-render needed — all component colours are CSS `var()` references.
