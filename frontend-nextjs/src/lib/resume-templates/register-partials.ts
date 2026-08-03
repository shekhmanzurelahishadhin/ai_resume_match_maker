// Register Handlebars partials from the shared/partials.hbs file.
// Partials are extracted from `{{#partial "name"}}...{{/partial}}` blocks.
//
// Importing this module once registers everything; importing it again is a no-op.
//
// NOTE: We read the .hbs file from disk with node:fs rather than using a
// bundler `?raw` import — this keeps us independent of Turbopack's loader
// config (which would need a custom rule for `.hbs` files).

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

import Handlebars from "handlebars";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function readPartialsSource(): string {
  // Resolve to the source file at dev time. In a `standalone` build the
  // source .hbs files are NOT copied, so we fall back to a bundled copy
  // (see BUNDLED_PARTIALS below) — that way production still works.
  try {
    return readFileSync(
      path.resolve(__dirname, "shared", "partials.hbs"),
      "utf8",
    );
  } catch {
    return BUNDLED_PARTIALS;
  }
}

// Fallback copy of shared/partials.hbs — kept in sync by the maintainers.
// Used only if the source file isn't reachable at runtime (standalone build).
const BUNDLED_PARTIALS = `{{#partial "contactHeader"}}
<header class="rm-contact">
  <h1 class="rm-name">{{contact.name}}</h1>
  <div class="rm-contact-links">
    {{#if contact.email}}<span>{{contact.email}}</span>{{/if}}
    {{#if contact.phone}}<span>· {{contact.phone}}</span>{{/if}}
    {{#if contact.location}}<span>· {{contact.location}}</span>{{/if}}
    {{#if contact.website}}<span>· <a href="{{contact.website}}">{{contact.website}}</a></span>{{/if}}
    {{#if contact.linkedin}}<span>· <a href="{{contact.linkedin}}">LinkedIn</a></span>{{/if}}
    {{#if contact.github}}<span>· <a href="{{contact.github}}">GitHub</a></span>{{/if}}
  </div>
</header>
{{/partial}}

{{#partial "skillsList"}}
{{#if skills.length}}
<section class="rm-section rm-skills">
  <h2 class="rm-section-title">Skills</h2>
  {{#each skills}}
    <div class="rm-skill-group">
      <span class="rm-skill-cat">{{this.category}}:</span>
      <span class="rm-skill-items">{{#each this.items}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}</span>
    </div>
  {{/each}}
</section>
{{/if}}
{{/partial}}

{{#partial "experienceList"}}
{{#if experience.length}}
<section class="rm-section rm-experience">
  <h2 class="rm-section-title">Experience</h2>
  {{#each experience}}
    <div class="rm-exp-item">
      <div class="rm-exp-head">
        <span class="rm-exp-position">{{this.position}}</span>
        <span class="rm-exp-meta">
          {{this.company}}{{#if this.startDate}} · {{this.startDate}}{{#if this.endDate}} – {{this.endDate}}{{else}} – Present{{/if}}{{/if}}
        </span>
      </div>
      {{#if this.description}}<p class="rm-exp-desc">{{this.description}}</p>{{/if}}
      {{#if this.bullets.length}}
      <ul class="rm-bullets">
        {{#each this.bullets}}<li>{{this}}</li>{{/each}}
      </ul>
      {{/if}}
    </div>
  {{/each}}
</section>
{{/if}}
{{/partial}}

{{#partial "educationList"}}
{{#if education.length}}
<section class="rm-section rm-education">
  <h2 class="rm-section-title">Education</h2>
  {{#each education}}
    <div class="rm-edu-item">
      <div class="rm-exp-head">
        <span class="rm-exp-position">{{this.institution}}</span>
        <span class="rm-exp-meta">
          {{#if this.startDate}}{{this.startDate}}{{#if this.endDate}} – {{this.endDate}}{{/if}}{{/if}}
        </span>
      </div>
      {{#if this.degree}}<p class="rm-exp-desc">{{this.degree}}{{#if this.field}}, {{this.field}}{{/if}}{{#if this.gpa}} · GPA: {{this.gpa}}{{/if}}</p>{{/if}}
    </div>
  {{/each}}
</section>
{{/if}}
{{/partial}}

{{#partial "projectsList"}}
{{#if projects.length}}
<section class="rm-section rm-projects">
  <h2 class="rm-section-title">Projects</h2>
  {{#each projects}}
    <div class="rm-exp-item">
      <div class="rm-exp-head">
        <span class="rm-exp-position">{{this.name}}</span>
        {{#if this.url}}<span class="rm-exp-meta"><a href="{{this.url}}">{{this.url}}</a></span>{{/if}}
      </div>
      {{#if this.description}}<p class="rm-exp-desc">{{this.description}}</p>{{/if}}
      {{#if this.technologies.length}}
      <p class="rm-exp-desc"><em>Tech: {{#each this.technologies}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}</em></p>
      {{/if}}
    </div>
  {{/each}}
</section>
{{/if}}
{{/partial}}

{{#partial "certificationsList"}}
{{#if certifications.length}}
<section class="rm-section rm-certs">
  <h2 class="rm-section-title">Certifications</h2>
  <ul class="rm-bullets">
    {{#each certifications}}
      <li><strong>{{this.name}}</strong>{{#if this.issuer}}, {{this.issuer}}{{/if}}{{#if this.date}} · {{this.date}}{{/if}}</li>
    {{/each}}
  </ul>
</section>
{{/if}}
{{/partial}}

{{#partial "summaryBlock"}}
{{#if summary}}
<section class="rm-section rm-summary">
  <h2 class="rm-section-title">Summary</h2>
  <p>{{summary}}</p>
</section>
{{/if}}
{{/partial}}
`;

let registered = false;

const PARTIAL_RE = /\{\{#partial\s+"([^"]+)"\}\}([\s\S]*?)\{\{\/partial\}\}/g;

export function registerPartials(): void {
  if (registered) return;
  registered = true;

  // Register a "raw" helper that just renders its contents — useful for
  // when a template author wants to bypass Handlebars entirely (rare).
  Handlebars.registerHelper("raw", function (this: unknown, options: { fn: (ctx: unknown) => string }) {
    return options.fn(this);
  });

  // Eq helper for simple equality comparisons.
  Handlebars.registerHelper("eq", (a: unknown, b: unknown) => a === b);

  const source = readPartialsSource();
  let match: RegExpExecArray | null;
  while ((match = PARTIAL_RE.exec(source)) !== null) {
    const [, name, body] = match;
    if (name && body) {
      Handlebars.registerPartial(name, body.trim());
    }
  }
}

// Register on module load (server-side only).
registerPartials();

export { Handlebars };
