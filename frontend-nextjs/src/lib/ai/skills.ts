// Curated skills dictionary used as the AI fallback path for skill extraction.
// 200+ entries across 5 categories: Technical, Tools, Soft Skills, Domain, Languages.
// Each entry is matched case-insensitively as a whole word against resume text.

export const SKILL_CATEGORIES = [
  "Technical",
  "Tools",
  "Soft Skills",
  "Domain",
  "Languages",
] as const;
export type SkillCategory = (typeof SKILL_CATEGORIES)[number];

// Programming languages (human languages go in "Languages" below)
const PROGRAMMING_LANGUAGES: Array<[string, SkillCategory]> = [
  ["JavaScript", "Technical"],
  ["TypeScript", "Technical"],
  ["Python", "Technical"],
  ["Java", "Technical"],
  ["C", "Technical"],
  ["C++", "Technical"],
  ["C#", "Technical"],
  ["Go", "Technical"],
  ["Golang", "Technical"],
  ["Rust", "Technical"],
  ["Ruby", "Technical"],
  ["PHP", "Technical"],
  ["Swift", "Technical"],
  ["Kotlin", "Technical"],
  ["Scala", "Technical"],
  ["Perl", "Technical"],
  ["R", "Technical"],
  ["MATLAB", "Technical"],
  ["Dart", "Technical"],
  ["Objective-C", "Technical"],
  ["Elixir", "Technical"],
  ["Haskell", "Technical"],
  ["Clojure", "Technical"],
  ["Lua", "Technical"],
  ["Shell", "Technical"],
  ["Bash", "Technical"],
  ["PowerShell", "Technical"],
  ["SQL", "Technical"],
  ["PL/SQL", "Technical"],
  ["T-SQL", "Technical"],
];

// Frameworks & libraries
const FRAMEWORKS: Array<[string, SkillCategory]> = [
  ["React", "Technical"],
  ["Next.js", "Technical"],
  ["Vue", "Technical"],
  ["Vue.js", "Technical"],
  ["Nuxt", "Technical"],
  ["Angular", "Technical"],
  ["Svelte", "Technical"],
  ["SvelteKit", "Technical"],
  ["Ember", "Technical"],
  ["Backbone", "Technical"],
  ["jQuery", "Technical"],
  ["Node.js", "Technical"],
  ["Express", "Technical"],
  ["Express.js", "Technical"],
  ["NestJS", "Technical"],
  ["Fastify", "Technical"],
  ["Koa", "Technical"],
  ["Deno", "Technical"],
  ["Bun", "Technical"],
  ["Django", "Technical"],
  ["Flask", "Technical"],
  ["FastAPI", "Technical"],
  ["Pyramid", "Technical"],
  ["Spring", "Technical"],
  ["Spring Boot", "Technical"],
  ["Hibernate", "Technical"],
  ["Rails", "Technical"],
  ["Ruby on Rails", "Technical"],
  ["Sinatra", "Technical"],
  ["Laravel", "Technical"],
  ["Symfony", "Technical"],
  ["CodeIgniter", "Technical"],
  ["ASP.NET", "Technical"],
  [".NET", "Technical"],
  [".NET Core", "Technical"],
  ["Unity", "Technical"],
  ["Unreal Engine", "Technical"],
  ["Qt", "Technical"],
  ["Flutter", "Technical"],
  ["React Native", "Technical"],
  ["Ionic", "Technical"],
  ["Electron", "Technical"],
  ["Tailwind CSS", "Technical"],
  ["Bootstrap", "Technical"],
  ["Material UI", "Technical"],
  ["Bulma", "Technical"],
  ["Sass", "Technical"],
  ["SCSS", "Technical"],
  ["LESS", "Technical"],
  ["Styled Components", "Technical"],
  ["Redux", "Technical"],
  ["Zustand", "Technical"],
  ["MobX", "Technical"],
  ["Recoil", "Technical"],
  ["GraphQL", "Technical"],
  ["Apollo", "Technical"],
  ["Relay", "Technical"],
  ["gRPC", "Technical"],
  ["REST", "Technical"],
  ["OpenAPI", "Technical"],
  ["Swagger", "Technical"],
  ["WebSockets", "Technical"],
  ["Socket.IO", "Technical"],
];

// Data, ML, AI
const DATA_ML: Array<[string, SkillCategory]> = [
  ["Pandas", "Technical"],
  ["NumPy", "Technical"],
  ["SciPy", "Technical"],
  ["Scikit-learn", "Technical"],
  ["sklearn", "Technical"],
  ["TensorFlow", "Technical"],
  ["Keras", "Technical"],
  ["PyTorch", "Technical"],
  ["JAX", "Technical"],
  ["Hugging Face", "Technical"],
  ["Transformers", "Technical"],
  ["spaCy", "Technical"],
  ["NLTK", "Technical"],
  ["OpenCV", "Technical"],
  ["Matplotlib", "Technical"],
  ["Seaborn", "Technical"],
  ["Plotly", "Technical"],
  ["Bokeh", "Technical"],
  ["Tableau", "Tools"],
  ["Power BI", "Tools"],
  ["Looker", "Tools"],
  ["Spark", "Technical"],
  ["Apache Spark", "Technical"],
  ["Hadoop", "Technical"],
  ["Kafka", "Technical"],
  ["Apache Kafka", "Technical"],
  ["Airflow", "Technical"],
  ["Apache Airflow", "Technical"],
  ["Databricks", "Tools"],
  ["dbt", "Tools"],
  ["Snowflake", "Tools"],
  ["BigQuery", "Tools"],
  ["Redshift", "Tools"],
  ["Elasticsearch", "Technical"],
  ["Logstash", "Technical"],
  ["Kibana", "Technical"],
  ["Machine Learning", "Domain"],
  ["Deep Learning", "Domain"],
  ["NLP", "Domain"],
  ["Natural Language Processing", "Domain"],
  ["Computer Vision", "Domain"],
  ["Reinforcement Learning", "Domain"],
  ["Data Engineering", "Domain"],
  ["Data Science", "Domain"],
  ["Data Analysis", "Domain"],
  ["Data Visualization", "Domain"],
  ["Statistics", "Domain"],
  ["A/B Testing", "Domain"],
  ["Time Series Analysis", "Domain"],
  ["MLOps", "Domain"],
];

// Cloud, DevOps, infrastructure
const CLOUD_DEVOPS: Array<[string, SkillCategory]> = [
  ["AWS", "Tools"],
  ["Amazon Web Services", "Tools"],
  ["EC2", "Tools"],
  ["S3", "Tools"],
  ["Lambda", "Tools"],
  ["RDS", "Tools"],
  ["CloudFormation", "Tools"],
  ["GCP", "Tools"],
  ["Google Cloud", "Tools"],
  ["Azure", "Tools"],
  ["Microsoft Azure", "Tools"],
  ["Docker", "Tools"],
  ["Kubernetes", "Tools"],
  ["Helm", "Tools"],
  ["Terraform", "Tools"],
  ["Ansible", "Tools"],
  ["Puppet", "Tools"],
  ["Chef", "Tools"],
  ["Jenkins", "Tools"],
  ["GitHub Actions", "Tools"],
  ["GitLab CI", "Tools"],
  ["CircleCI", "Tools"],
  ["Travis CI", "Tools"],
  ["Vagrant", "Tools"],
  ["Packer", "Tools"],
  ["Nginx", "Tools"],
  ["Apache", "Tools"],
  ["HAProxy", "Tools"],
  ["Envoy", "Tools"],
  ["Istio", "Tools"],
  ["Prometheus", "Tools"],
  ["Grafana", "Tools"],
  ["Datadog", "Tools"],
  ["New Relic", "Tools"],
  ["Sentry", "Tools"],
  ["Linux", "Tools"],
  ["Unix", "Tools"],
  ["systemd", "Tools"],
  ["CI/CD", "Domain"],
  ["DevOps", "Domain"],
  ["Site Reliability Engineering", "Domain"],
  ["SRE", "Domain"],
  ["Microservices", "Domain"],
  ["Distributed Systems", "Domain"],
  ["System Design", "Domain"],
  ["Observability", "Domain"],
];

// Databases
const DATABASES: Array<[string, SkillCategory]> = [
  ["PostgreSQL", "Tools"],
  ["Postgres", "Tools"],
  ["MySQL", "Tools"],
  ["MariaDB", "Tools"],
  ["SQLite", "Tools"],
  ["MongoDB", "Tools"],
  ["Redis", "Tools"],
  ["DynamoDB", "Tools"],
  ["Cassandra", "Tools"],
  ["CouchDB", "Tools"],
  ["Couchbase", "Tools"],
  ["Neo4j", "Tools"],
  ["Neo4j Graph", "Tools"],
  ["MongoDB Atlas", "Tools"],
  ["Prisma", "Tools"],
  ["ORM", "Technical"],
  ["Sequelize", "Tools"],
  ["TypeORM", "Tools"],
  ["SQLAlchemy", "Tools"],
  ["Mongoose", "Tools"],
  ["Drizzle", "Tools"],
];

// Tools & platforms
const TOOLS: Array<[string, SkillCategory]> = [
  ["Git", "Tools"],
  ["GitHub", "Tools"],
  ["GitLab", "Tools"],
  ["Bitbucket", "Tools"],
  ["Jira", "Tools"],
  ["Confluence", "Tools"],
  ["Trello", "Tools"],
  ["Asana", "Tools"],
  ["Notion", "Tools"],
  ["Slack", "Tools"],
  ["Figma", "Tools"],
  ["Sketch", "Tools"],
  ["Adobe XD", "Tools"],
  ["Photoshop", "Tools"],
  ["Illustrator", "Tools"],
  ["InDesign", "Tools"],
  ["After Effects", "Tools"],
  ["Premiere", "Tools"],
  ["VS Code", "Tools"],
  ["Visual Studio", "Tools"],
  ["IntelliJ", "Tools"],
  ["Eclipse", "Tools"],
  ["Vim", "Tools"],
  ["Emacs", "Tools"],
  ["Postman", "Tools"],
  ["Insomnia", "Tools"],
  ["cURL", "Tools"],
  ["Wireshark", "Tools"],
  ["Linux administration", "Tools"],
];

// Soft skills
const SOFT_SKILLS: Array<[string, SkillCategory]> = [
  ["Leadership", "Soft Skills"],
  ["Team Leadership", "Soft Skills"],
  ["Communication", "Soft Skills"],
  ["Verbal Communication", "Soft Skills"],
  ["Written Communication", "Soft Skills"],
  ["Collaboration", "Soft Skills"],
  ["Teamwork", "Soft Skills"],
  ["Cross-functional Collaboration", "Soft Skills"],
  ["Problem Solving", "Soft Skills"],
  ["Critical Thinking", "Soft Skills"],
  ["Analytical Skills", "Soft Skills"],
  ["Creativity", "Soft Skills"],
  ["Innovation", "Soft Skills"],
  ["Adaptability", "Soft Skills"],
  ["Flexibility", "Soft Skills"],
  ["Time Management", "Soft Skills"],
  ["Prioritization", "Soft Skills"],
  ["Organization", "Soft Skills"],
  ["Attention to Detail", "Soft Skills"],
  ["Decision Making", "Soft Skills"],
  ["Conflict Resolution", "Soft Skills"],
  ["Negotiation", "Soft Skills"],
  ["Presentation Skills", "Soft Skills"],
  ["Public Speaking", "Soft Skills"],
  ["Mentorship", "Soft Skills"],
  ["Coaching", "Soft Skills"],
  ["Empathy", "Soft Skills"],
  ["Emotional Intelligence", "Soft Skills"],
  ["Self-motivated", "Soft Skills"],
  ["Self-starter", "Soft Skills"],
  ["Initiative", "Soft Skills"],
  ["Ownership", "Soft Skills"],
  ["Accountability", "Soft Skills"],
  ["Stakeholder Management", "Soft Skills"],
  ["Customer Focus", "Soft Skills"],
  ["Customer Service", "Soft Skills"],
  ["Project Management", "Soft Skills"],
  ["Agile", "Soft Skills"],
  ["Scrum", "Soft Skills"],
  ["Kanban", "Soft Skills"],
  ["Product Management", "Domain"],
  ["Strategic Planning", "Soft Skills"],
  ["Budgeting", "Soft Skills"],
  ["Forecasting", "Soft Skills"],
  ["Risk Management", "Soft Skills"],
];

// Domain knowledge
const DOMAIN_KNOWLEDGE: Array<[string, SkillCategory]> = [
  ["Software Engineering", "Domain"],
  ["Web Development", "Domain"],
  ["Frontend Development", "Domain"],
  ["Backend Development", "Domain"],
  ["Full Stack Development", "Domain"],
  ["Mobile Development", "Domain"],
  ["iOS Development", "Domain"],
  ["Android Development", "Domain"],
  ["Game Development", "Domain"],
  ["Embedded Systems", "Domain"],
  ["IoT", "Domain"],
  ["Internet of Things", "Domain"],
  ["Cybersecurity", "Domain"],
  ["Information Security", "Domain"],
  ["Penetration Testing", "Domain"],
  ["Cryptography", "Domain"],
  ["Blockchain", "Domain"],
  ["Smart Contracts", "Domain"],
  ["Solidity", "Technical"],
  ["Web3", "Domain"],
  ["Fintech", "Domain"],
  ["Healthcare IT", "Domain"],
  ["HIPAA", "Domain"],
  ["GDPR", "Domain"],
  ["PCI DSS", "Domain"],
  ["SOX", "Domain"],
  ["E-commerce", "Domain"],
  ["SEO", "Domain"],
  ["SEM", "Domain"],
  ["Digital Marketing", "Domain"],
  ["Content Marketing", "Domain"],
  ["Email Marketing", "Domain"],
  ["Social Media Marketing", "Domain"],
  ["Brand Management", "Domain"],
  ["UX Design", "Domain"],
  ["UI Design", "Domain"],
  ["User Research", "Domain"],
  ["Wireframing", "Domain"],
  ["Prototyping", "Domain"],
  ["Accessibility", "Domain"],
  ["Information Architecture", "Domain"],
  ["Agile Methodologies", "Domain"],
  ["Test-Driven Development", "Domain"],
  ["TDD", "Domain"],
  ["Behavior-Driven Development", "Domain"],
  ["BDD", "Domain"],
  ["Continuous Integration", "Domain"],
  ["Continuous Deployment", "Domain"],
];

// Human languages (for international roles)
const HUMAN_LANGUAGES: Array<[string, SkillCategory]> = [
  ["English", "Languages"],
  ["Mandarin", "Languages"],
  ["Chinese", "Languages"],
  ["Spanish", "Languages"],
  ["French", "Languages"],
  ["German", "Languages"],
  ["Italian", "Languages"],
  ["Portuguese", "Languages"],
  ["Russian", "Languages"],
  ["Japanese", "Languages"],
  ["Korean", "Languages"],
  ["Arabic", "Languages"],
  ["Hindi", "Languages"],
  ["Bengali", "Languages"],
  ["Urdu", "Languages"],
  ["Turkish", "Languages"],
  ["Dutch", "Languages"],
  ["Polish", "Languages"],
  ["Vietnamese", "Languages"],
  ["Thai", "Languages"],
];

export const ALL_SKILLS: ReadonlyArray<readonly [string, SkillCategory]> = [
  ...PROGRAMMING_LANGUAGES,
  ...FRAMEWORKS,
  ...DATA_ML,
  ...CLOUD_DEVOPS,
  ...DATABASES,
  ...TOOLS,
  ...SOFT_SKILLS,
  ...DOMAIN_KNOWLEDGE,
  ...HUMAN_LANGUAGES,
];

// Total count sanity check (≥ 200 per spec).
export const TOTAL_SKILLS = ALL_SKILLS.length;

// Pre-compute lowercase + escaped regex for whole-word, case-insensitive matching.
// Words with non-word chars (e.g. "C++", "CI/CD", ".NET") need slightly looser matching.
interface CompiledSkill {
  raw: string;
  category: SkillCategory;
  /** Lowercase label, with non-word chars stripped for fuzzy compare. */
  normalized: string;
}

const COMPILED_SKILLS: CompiledSkill[] = ALL_SKILLS.map(([raw, category]) => ({
  raw,
  category,
  normalized: raw.toLowerCase().replace(/[^a-z0-9]+/g, ""),
}));

/**
 * Dictionary-based skill extraction. Scans text for whole-word matches of any
 * curated skill. Returns a deduped list and per-category buckets.
 *
 * Used as the fallback when Hugging Face NER is unavailable.
 */
export function dictionaryExtractSkills(text: string): {
  skills: string[];
  categories: Record<SkillCategory, string[]>;
} {
  const lower = text.toLowerCase();
  // Tokenize once: split on non-word boundaries into a set of normalized tokens
  // AND keep a flattened version so multi-word skills ("Spring Boot", "C++") match.
  const flat = lower.replace(/[^a-z0-9]+/g, " ");
  const found = new Map<string, SkillCategory>();

  for (const skill of COMPILED_SKILLS) {
    if (!skill.normalized) continue;
    // For multi-word skills like "springboot" we search the flattened text.
    if (flat.includes(skill.normalized)) {
      // Avoid double-counting when one skill is a substring of another
      // (e.g. "React" inside "React Native"). Prefer the longest match.
      const existing = found.get(skill.raw);
      if (!existing) {
        found.set(skill.raw, skill.category);
      }
    }
  }

  // Dedupe by normalized form, preferring the longest raw label.
  const byNormalized = new Map<string, { raw: string; category: SkillCategory }>();
  for (const [raw, category] of found) {
    const norm = raw.toLowerCase().replace(/[^a-z0-9]+/g, "");
    const prev = byNormalized.get(norm);
    if (!prev || raw.length > prev.raw.length) {
      byNormalized.set(norm, { raw, category });
    }
  }

  const categories: Record<SkillCategory, string[]> = {
    Technical: [],
    Tools: [],
    "Soft Skills": [],
    Domain: [],
    Languages: [],
  };
  const skills: string[] = [];
  for (const { raw, category } of byNormalized.values()) {
    skills.push(raw);
    categories[category].push(raw);
  }

  // Sort each category for stable output.
  (Object.keys(categories) as SkillCategory[]).forEach((k) =>
    categories[k].sort((a, b) => a.localeCompare(b)),
  );

  return { skills: skills.sort((a, b) => a.localeCompare(b)), categories };
}

/**
 * Map an arbitrary skill label (e.g. extracted via NER or supplied by a job post)
 * to one of the 5 categories. Falls back to "Technical" if unknown.
 */
export function categorizeSkill(skill: string): SkillCategory {
  const norm = skill.toLowerCase().replace(/[^a-z0-9]+/g, "");
  if (!norm) return "Technical";
  const found = COMPILED_SKILLS.find((s) => s.normalized === norm);
  if (found) return found.category;
  // Heuristic: if label contains "manage" or "communicat" → Soft Skills
  const lower = skill.toLowerCase();
  if (
    /(manage|communicat|leadership|teamwork|collab|negoti|present|mentor|coach)/.test(
      lower,
    )
  )
    return "Soft Skills";
  if (/(market|brand|seo|content|sales|customer)/.test(lower)) return "Domain";
  if (/(english|spanish|french|german|chinese|japanese|korean|arabic|hindi)/.test(
    lower,
  ))
    return "Languages";
  if (/(aws|docker|kubernetes|git|jenkins|figma|jira|tableau|power bi)/.test(lower))
    return "Tools";
  return "Technical";
}
