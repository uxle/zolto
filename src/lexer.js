/**
 * Zolto Block Lexer — Phase 2
 *
 * Phase 1: frontmatter · fenced_code · heading · hr · blockquote
 *           list · table · comment · html_block · import ·
 *           variable_def · footnote_def · blank · paragraph
 *
 * Phase 2 adds:
 *   T.ADMONITION      — [info]…[/info] native blocks
 *   T.REFERENCE_DEF   — [id]: url "title"
 *   T.DEFINITION_LIST — term\n: definition
 *   table.caption     — Caption: text before a table
 *   Callouts detected in parser from BLOCKQUOTE content
 */

import { KNOWN_DIRECTIVES, lexDirective } from './directive-lexer.js';

// ─── Token type constants ─────────────────────────────────────────────────────
export const T = Object.freeze({
  FRONTMATTER:    'frontmatter',
  FENCED_CODE:    'fenced_code',
  HEADING:        'heading',
  HR:             'hr',
  BLOCKQUOTE:     'blockquote',
  LIST:           'list',
  TABLE:          'table',
  COMMENT:        'comment',
  HTML_BLOCK:     'html_block',
  IMPORT:         'import',
  VARIABLE_DEF:   'variable_def',
  FOOTNOTE_DEF:   'footnote_def',
  ADMONITION:     'admonition',     // Phase 2
  REFERENCE_DEF:  'reference_def',  // Phase 2
  DEFINITION_LIST:'definition_list',// Phase 2
  DIRECTIVE:      'directive',       // Phase 3
  BLANK:          'blank',
  PARAGRAPH:      'paragraph',
});

// ─── Admonition types (kept in sync with ast.js) ─────────────────────────────
const ADMON_TYPES = new Set([
  'info','warning','tip','success','danger','note',
  'definition','theorem','proof','caution','important',
  'example','question','bug','quote','abstract','todo',
  'failure','seealso','summary','hint','check','attention',
]);

// ─── Block regex patterns ─────────────────────────────────────────────────────
const RE = {
  BLANK:        /^\s*$/,
  HEADING:      /^(#{1,6})(?:[ \t]+|$)(.*)/,
  HR:           /^(?:[-*_=~][ \t]*){3,}[ \t]*$/,
  FENCE_OPEN:   /^(`{3,}|~{3,})([ \t]*\S.*)?$/,
  BLOCKQUOTE:   /^(>+)[ \t]?(.*)/,
  UL_ITEM:      /^([ \t]*)[*+-][ \t]+(.*)/,
  OL_ITEM:      /^([ \t]*)(\d{1,9})([.)])[ \t]+(.*)/,
  TABLE_ROW:    /^\|/,
  TABLE_SEP:    /^\|?[ \t]*:?-{1,}:?[ \t]*(?:\|[ \t]*:?-{1,}:?[ \t]*)*\|?[ \t]*$/,
  COMMENT_OPEN: /<!--/,
  COMMENT_CLOSE:/-->/,
  HTML_TAG:     /^<([A-Za-z][A-Za-z0-9-]*)(?:[ \t>\/]|$)/,
  IMPORT:       /^@import[ \t]+['"]([^'"]+)['"][ \t]*$/,
  VAR_DEF:      /^@var[ \t]+([\w$][\w$-]*)[ \t]*=[ \t]*(.+)$/,
  FOOTNOTE_DEF: /^\[\^([^\]]+)\]:[ \t]*(.*)/,
  // Phase 2
  ADMON_OPEN:   /^\[([a-zA-Z]+)(?:[ \t]+title=["']([^"']+)["'])?\][ \t]*$/,
  ADMON_CLOSE:  /^\[\/([a-zA-Z]+)\][ \t]*$/,
  REF_DEF:      /^\[([^\]^/\s][^\]]*)\]:[ \t]+(\S+)(?:[ \t]+"([^"]*)")?[ \t]*$/,
  DEFLIST_ITEM: /^:[ \t]+(.+)/,
  CAPTION:      /^(?:Table|Caption|Figure):[ \t]+(.+)$/i,
};

const BLOCK_TAGS = new Set([
  'address','article','aside','base','basefont','blockquote','body','caption',
  'center','col','colgroup','dd','details','dialog','dir','div','dl','dt',
  'fieldset','figcaption','figure','footer','form','frame','frameset',
  'h1','h2','h3','h4','h5','h6','head','header','hr','html','iframe',
  'legend','li','link','main','menu','menuitem','meta','nav','noframes',
  'ol','optgroup','option','p','param','section','summary','table',
  'tbody','td','tfoot','th','thead','title','tr','track','ul',
]);

// ─── Helpers ──────────────────────────────────────────────────────────────────
const isListStart = l => RE.UL_ITEM.test(l) || RE.OL_ITEM.test(l);
const getIndent   = l => (l.match(/^([ \t]*)/)?.[1] ?? '').length;

function lastReal(tokens) {
  for (let i = tokens.length - 1; i >= 0; i--)
    if (tokens[i].type !== T.BLANK) return tokens[i];
  return null;
}

function lastRealIndex(tokens) {
  for (let i = tokens.length - 1; i >= 0; i--)
    if (tokens[i].type !== T.BLANK) return i;
  return -1;
}

// ─── Main tokenizer ───────────────────────────────────────────────────────────

/**
 * @param {string} src
 * @returns {{ tokens: BlockToken[], errors: LexError[] }}
 */
export function tokenize(src) {
  const lines  = src.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const tokens = [];
  const errors = [];
  let i = 0;

  const err = msg => errors.push({ message: msg, line: i + 1 });

  // ── Front-matter (only at document start, requires closing ---) ──────────
  if (lines[0] === '---') {
    let fmClose = -1;
    for (let j = 1; j < lines.length; j++) {
      if (lines[j] === '---') { fmClose = j; break; }
    }
    if (fmClose !== -1) {
      tokens.push({
        type:  T.FRONTMATTER,
        raw:   lines.slice(0, fmClose + 1).join('\n'),
        value: lines.slice(1, fmClose).join('\n'),
      });
      i = fmClose + 1;
    } else {
      err('Unclosed frontmatter block (no closing --- found)');
    }
  }

  // ── Main scan ────────────────────────────────────────────────────────────
  while (i < lines.length) {
    const line = lines[i];

    // · Blank ─────────────────────────────────────────────────────────────
    if (RE.BLANK.test(line)) { tokens.push({ type: T.BLANK, raw: line }); i++; continue; }

    // · HTML comment ──────────────────────────────────────────────────────
    if (RE.COMMENT_OPEN.test(line)) {
      const start = i; let raw = ''; let closed = false;
      while (i < lines.length) {
        raw += (i > start ? '\n' : '') + lines[i];
        if (RE.COMMENT_CLOSE.test(raw)) { closed = true; i++; break; }
        i++;
      }
      if (!closed) err('Unclosed comment');
      tokens.push({
        type:  T.COMMENT,
        raw,
        value: raw.replace(/^<!--\s?/, '').replace(/\s?-->$/, '').trim(),
      });
      continue;
    }

    // · @import ───────────────────────────────────────────────────────────
    { const m = RE.IMPORT.exec(line);
      if (m) { tokens.push({ type: T.IMPORT, raw: line, path: m[1] }); i++; continue; } }

    // · @var ──────────────────────────────────────────────────────────────
    { const m = RE.VAR_DEF.exec(line);
      if (m) { tokens.push({ type: T.VARIABLE_DEF, raw: line, name: m[1], value: m[2].trim() }); i++; continue; } }


    // · @directive blocks  (Phase 3) ------------------------------------------
    { const dm = /^@([a-z][a-z0-9-]*)(.*)$/.exec(line);
      if (dm && KNOWN_DIRECTIVES.has(dm[1])) {
        const { tok, nextI } = lexDirective(lines, i, dm[1], dm[2].trim());
        tokens.push(tok);
        i = nextI;
        continue;
      }
    }

    // · Admonition block  [info]…[/info]  (Phase 2) ───────────────────────
    { const m = RE.ADMON_OPEN.exec(line);
      if (m && ADMON_TYPES.has(m[1].toLowerCase())) {
        const admonType = m[1].toLowerCase();
        const title     = m[2] ?? null;
        const startLine = i;
        const bodyLines = [];
        let closed = false;
        i++;
        while (i < lines.length) {
          const cm = RE.ADMON_CLOSE.exec(lines[i]);
          if (cm && cm[1].toLowerCase() === admonType) { closed = true; i++; break; }
          bodyLines.push(lines[i]); i++;
        }
        if (!closed) err(`Unclosed admonition [${admonType}]`);
        tokens.push({
          type:      T.ADMONITION,
          raw:       lines.slice(startLine, i).join('\n'),
          admonType,
          title,
          content:   bodyLines.join('\n'),
        });
        continue;
      }
    }

    // · Reference link definition  [id]: url "title"  (Phase 2) ──────────
    { const m = RE.REF_DEF.exec(line);
      if (m) {
        tokens.push({ type: T.REFERENCE_DEF, raw: line, id: m[1].toLowerCase(), href: m[2], title: m[3] ?? null });
        i++; continue;
      }
    }

    // · Fenced code block ─────────────────────────────────────────────────
    { const m = RE.FENCE_OPEN.exec(line);
      if (m) {
        const fence     = m[1]; const fenceChar = fence[0];
        const info      = m[2] ? m[2].trim() : '';
        const spaceIdx  = info.search(/\s/);
        const lang      = spaceIdx > 0 ? info.slice(0, spaceIdx) : (info || null);
        const meta      = spaceIdx > 0 ? info.slice(spaceIdx + 1).trim() || null : null;
        const startLine = i; const codeLines = []; let closed = false;
        i++;
        while (i < lines.length) {
          const stripped = lines[i].trimStart();
          if (stripped.startsWith(fenceChar.repeat(fence.length)) &&
              !stripped.slice(fence.length).trim().includes(fenceChar)) {
            closed = true; i++; break;
          }
          codeLines.push(lines[i]); i++;
        }
        if (!closed) err(`Unclosed code fence (${fence})`);
        tokens.push({ type: T.FENCED_CODE, raw: lines.slice(startLine, i).join('\n'), lang, meta, value: codeLines.join('\n') });
        continue;
      }
    }

    // · ATX Heading ───────────────────────────────────────────────────────
    { const m = RE.HEADING.exec(line);
      if (m) { tokens.push({ type: T.HEADING, raw: line, level: m[1].length, text: m[2].trim() }); i++; continue; } }

    // · Horizontal rule ───────────────────────────────────────────────────
    if (RE.HR.test(line.trim())) { tokens.push({ type: T.HR, raw: line }); i++; continue; }

    // · Footnote definition  [^id]: … ────────────────────────────────────
    { const m = RE.FOOTNOTE_DEF.exec(line);
      if (m) {
        const startLine = i; let content = m[2]; i++;
        while (i < lines.length && !RE.BLANK.test(lines[i]) && /^[ \t]{1,4}/.test(lines[i])) {
          content += '\n' + lines[i].replace(/^[ \t]{1,4}/, ''); i++;
        }
        tokens.push({ type: T.FOOTNOTE_DEF, raw: lines.slice(startLine, i).join('\n'), id: m[1], content: content.trim() });
        continue;
      }
    }

    // · Blockquote ────────────────────────────────────────────────────────
    if (RE.BLOCKQUOTE.test(line)) {
      const rawLines = [];
      while (i < lines.length) {
        if (RE.BLANK.test(lines[i])) break;
        rawLines.push(lines[i]); i++;
        if (!RE.BLOCKQUOTE.test(lines[i] ?? '') &&
            !RE.BLANK.test(lines[i] ?? '') &&
            !RE.HEADING.exec(lines[i] ?? '') &&
            !RE.HR.test((lines[i] ?? '').trim()) &&
            !RE.FENCE_OPEN.test(lines[i] ?? '')) break;
      }
      const content = rawLines.map(l => l.replace(/^>+[ \t]?/, '')).join('\n');
      tokens.push({ type: T.BLOCKQUOTE, raw: rawLines.join('\n'), content });
      continue;
    }

    // · List ──────────────────────────────────────────────────────────────
    if (isListStart(line)) {
      const startLine = i; const rawLines = [line];
      const baseIndent = getIndent(line);
      const ordered    = RE.OL_ITEM.test(line);
      i++;
      while (i < lines.length) {
        const l = lines[i];
        if (RE.BLANK.test(l)) {
          let k = i + 1;
          while (k < lines.length && RE.BLANK.test(lines[k])) k++;
          if (k < lines.length) {
            const next = lines[k];
            if ((isListStart(next) && getIndent(next) >= baseIndent) || /^[ \t]/.test(next)) {
              rawLines.push(l); i++; continue;
            }
          }
          break;
        }
        if (isListStart(l) || /^[ \t]/.test(l)) { rawLines.push(l); i++; continue; }
        break;
      }
      tokens.push({ type: T.LIST, raw: rawLines.join('\n'), ordered });
      continue;
    }

    // · Definition list (Phase 2) — `: definition` after a paragraph ──────
    { const m = RE.DEFLIST_ITEM.exec(line);
      if (m) {
        const prevIdx = lastRealIndex(tokens);
        const prev    = prevIdx !== -1 ? tokens[prevIdx] : null;
        if (prev && prev.type === T.PARAGRAPH) {
          const terms = prev.raw.split('\n').map(l => l.trim()).filter(Boolean);
          tokens.splice(prevIdx, 1); // replace paragraph with definition list
          const defs = [];
          while (i < lines.length) {
            const dm = RE.DEFLIST_ITEM.exec(lines[i]);
            if (dm) { defs.push(lines[i].replace(/^:[ \t]+/, '').trim()); i++; }
            else if (RE.BLANK.test(lines[i])) break;
            else break;
          }
          tokens.push({ type: T.DEFINITION_LIST, raw: prev.raw, terms, defs });
          continue;
        }
      }
    }

    // · Table ─────────────────────────────────────────────────────────────
    if (RE.TABLE_ROW.test(line)) {
      const startLine = i; const rawLines = [line]; i++;
      while (i < lines.length && (RE.TABLE_ROW.test(lines[i]) || RE.TABLE_SEP.test(lines[i]))) {
        rawLines.push(lines[i]); i++;
      }
      const hasSep = rawLines.some(r => RE.TABLE_SEP.test(r));
      if (hasSep && rawLines.length >= 2) {
        // Check for caption in preceding paragraph (may not be the literal
        // last array element if blank-line tokens were emitted after it)
        let caption = null;
        const prevIdx = lastRealIndex(tokens);
        const prev    = prevIdx !== -1 ? tokens[prevIdx] : null;
        if (prev && prev.type === T.PARAGRAPH) {
          const cm = RE.CAPTION.exec(prev.raw.trim());
          if (cm) { caption = cm[1].trim(); tokens.splice(prevIdx, 1); }
        }
        tokens.push({ type: T.TABLE, raw: rawLines.join('\n'), rows: rawLines, caption });
      } else {
        tokens.push({ type: T.PARAGRAPH, raw: rawLines.join('\n') });
      }
      continue;
    }

    // · HTML block ────────────────────────────────────────────────────────
    { const m = RE.HTML_TAG.exec(line);
      if (m && BLOCK_TAGS.has(m[1].toLowerCase())) {
        const tag = m[1].toLowerCase();
        const closeRe = new RegExp(`</${tag}\\s*>`, 'i');
        const rawLines = [line]; i++;
        while (i < lines.length && !RE.BLANK.test(lines[i])) {
          rawLines.push(lines[i]);
          if (closeRe.test(lines[i])) { i++; break; }
          i++;
        }
        tokens.push({ type: T.HTML_BLOCK, raw: rawLines.join('\n'), value: rawLines.join('\n') });
        continue;
      }
    }

    // · Paragraph ─────────────────────────────────────────────────────────
    { const rawLines = [];
      while (i < lines.length) {
        const l = lines[i];
        if (RE.BLANK.test(l))               break;
        if (RE.HEADING.exec(l)?.[1])         break;
        if (RE.HR.test(l.trim()))            break;
        if (RE.FENCE_OPEN.test(l))           break;
        if (RE.IMPORT.test(l))               break;
        if (RE.VAR_DEF.test(l))              break;
        if (RE.FOOTNOTE_DEF.test(l))         break;
        if (RE.ADMON_OPEN.exec(l)?.[1] && ADMON_TYPES.has((RE.ADMON_OPEN.exec(l)?.[1] ?? '').toLowerCase())) break;
        if (RE.REF_DEF.test(l))             break;
        if (RE.COMMENT_OPEN.test(l) && rawLines.length) break;
        // Lists interrupt paragraphs (Phase 2 fix)
        if (rawLines.length && (RE.UL_ITEM.test(l) || RE.OL_ITEM.test(l))) break;
        if (rawLines.length && RE.BLOCKQUOTE.test(l)) break;
        if (rawLines.length && RE.DEFLIST_ITEM.test(l)) break;
        rawLines.push(l); i++;
      }
      if (rawLines.length) tokens.push({ type: T.PARAGRAPH, raw: rawLines.join('\n') });
    }
  }

  return { tokens, errors };
}
