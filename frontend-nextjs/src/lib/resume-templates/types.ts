// Shared types for resume templates.

export interface TemplateMeta {
  slug: string;
  name: string;
  description: string;
  colors: {
    primary: string;
    accent: string;
    text: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
}

// Shared page-level CSS injected into every template's HTML wrapper.
// Per-template meta.ts adds extra CSS for accents / fonts / layout.
export const BASE_CSS = `
:root { color-scheme: light; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  font-family: var(--rm-font-body, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif);
  color: var(--rm-color-text, #1f2937);
  background: #ffffff;
  font-size: 13px;
  line-height: 1.5;
}
.rm-page {
  max-width: 800px;
  margin: 0 auto;
  padding: 40px;
}
.rm-name {
  font-family: var(--rm-font-heading, inherit);
  font-size: 28px;
  font-weight: 700;
  margin: 0 0 4px 0;
  color: var(--rm-color-text, #111827);
  letter-spacing: -0.01em;
}
.rm-contact-links {
  font-size: 12px;
  color: #4b5563;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0;
}
.rm-contact-links a { color: var(--rm-color-primary, #059669); text-decoration: none; }
.rm-contact-links a:hover { text-decoration: underline; }
.rm-section { margin-top: 22px; }
.rm-section-title {
  font-family: var(--rm-font-heading, inherit);
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--rm-color-primary, #059669);
  margin: 0 0 10px 0;
  padding-bottom: 4px;
  border-bottom: 1.5px solid var(--rm-color-primary, #059669);
}
.rm-exp-item, .rm-edu-item { margin-bottom: 12px; }
.rm-exp-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  align-items: baseline;
}
.rm-exp-position { font-weight: 600; }
.rm-exp-meta { font-size: 12px; color: #4b5563; }
.rm-exp-desc { margin: 4px 0 0 0; color: #374151; }
.rm-bullets { margin: 6px 0 0 18px; padding: 0; color: #374151; }
.rm-bullets li { margin-bottom: 3px; }
.rm-skill-group { margin-bottom: 6px; }
.rm-skill-cat { font-weight: 600; color: #374151; margin-right: 6px; }
.rm-skill-items { color: #4b5563; }
.rm-summary p { margin: 0; color: #374151; }
`;
