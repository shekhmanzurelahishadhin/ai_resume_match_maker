{{--
  Document shell shared by every resume template.

  Receives:
    $content  normalised content (see ResumeTemplateRenderer::normalizeContent)
    $theme    resolved theme — colours, fonts, spacing. Every value in it has
              been validated or looked up from a fixed list, so it is safe to
              print into CSS.

  Templates extend this and fill two sections:
    @section('styles')  template-specific CSS
    @section('body')    the page markup

  Layout rule: use tables, not flexbox/grid. dompdf supports neither, and
  the same HTML is used for the on-screen preview and the PDF export.
--}}
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>{{ $content['contact']['name'] !== '' ? $content['contact']['name'].' — Resume' : 'Resume' }}</title>
<style>
@page { margin: {{ $theme['pdf'] ? $theme['pagePad'] : '0' }}; }
* { box-sizing: border-box; }
/* Only reset body. dompdf applies @page margins as the <html> element's
   margin, so resetting html here silently removed every PDF page margin. */
body { margin: 0; padding: 0; }
body {
    font-family: {!! $theme['bodyFont'] !!};
    font-size: {{ $theme['baseSize'] }};
    line-height: 1.45;
    color: {{ $theme['text'] }};
    background: #ffffff;
}
a { color: inherit; text-decoration: none; }
p { margin: 0; }
ul { margin: 0; padding: 0; }

.rm-page {
    max-width: 820px;
    margin: 0 auto;
    padding: {{ $theme['pdf'] ? '0' : $theme['pagePad'] }};
}

/* Generic layout helpers — tables so dompdf lays them out too. */
/* Kept at single-class specificity so a template's `td.something` rule,
   which comes later in the stylesheet, can override the padding. */
.rm-row, .rm-cols, .rm-grid { width: 100%; border-collapse: collapse; }
.rm-row td, .rm-cols td, .rm-grid td { vertical-align: top; padding: 0; }
td.rm-right { text-align: right; white-space: nowrap; padding-left: 12px; }

/* Headings */
.rm-name {
    font-family: {!! $theme['headingFont'] !!};
    font-size: 26px;
    font-weight: 700;
    line-height: 1.15;
    margin: 0;
}
.rm-headline { color: {{ $theme['muted'] }}; margin-top: 3px; }
.rm-h {
    font-family: {!! $theme['headingFont'] !!};
    font-size: 11.5px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: {{ $theme['primary'] }};
    margin: 0 0 8px 0;
}
.rm-section { margin-top: {{ $theme['sectionGap'] }}; }
.rm-section:first-child { margin-top: 0; }

/* Items */
.rm-item { margin-bottom: {{ $theme['itemGap'] }}; page-break-inside: avoid; }
.rm-item:last-child { margin-bottom: 0; }
.rm-title { font-weight: 700; }
.rm-sub { color: {{ $theme['muted'] }}; }
.rm-date { color: {{ $theme['faint'] }}; font-size: 0.92em; }
.rm-desc { color: {{ $theme['muted'] }}; margin-top: 3px; }
.rm-bullets { margin: 4px 0 0 0; padding-left: 16px; color: {{ $theme['text'] }}; }
.rm-bullets li { margin-bottom: 2px; }
.rm-tech { color: {{ $theme['faint'] }}; font-size: 0.92em; margin-top: 3px; }
.rm-link { color: {{ $theme['primary'] }}; }

/* Contact */
.rm-contact-line { color: {{ $theme['muted'] }}; margin-top: 6px; }
.rm-contact-line .rm-sep { color: {{ $theme['faint'] }}; padding: 0 5px; }
.rm-contact-stack div { margin-bottom: 3px; word-wrap: break-word; }

/* Skills */
.rm-skill-row { margin-bottom: 4px; }
.rm-skill-cat { font-weight: 700; }
.rm-chip {
    display: inline-block;
    padding: 2px 8px;
    margin: 0 4px 5px 0;
    border-radius: 10px;
    line-height: 1.35;
    font-size: 0.9em;
    background: {{ $theme['tint'] }};
    color: {{ $theme['primary'] }};
}
.rm-skill-group { margin-bottom: 6px; }
.rm-skill-group-label { font-size: 0.85em; font-weight: 700; color: {{ $theme['faint'] }}; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; }

@yield('styles')
</style>
</head>
<body>
@yield('body')
</body>
</html>
