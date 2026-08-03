<?php

namespace App\Services;

/**
 * Curated skills dictionary used as the AI fallback path for skill extraction
 * (§3 of the spec). Mirrors src/lib/ai/skills.ts in the Next.js app —
 * 230+ entries across 5 categories: Technical, Tools, Soft Skills, Domain, Languages.
 *
 * Each entry is matched case-insensitively (whole-word, with multi-word
 * normalization) against resume text.
 */
class SkillsDictionary
{
    public const CATEGORY_TECHNICAL = 'Technical';
    public const CATEGORY_TOOLS = 'Tools';
    public const CATEGORY_SOFT_SKILLS = 'Soft Skills';
    public const CATEGORY_DOMAIN = 'Domain';
    public const CATEGORY_LANGUAGES = 'Languages';

    public const CATEGORIES = [
        self::CATEGORY_TECHNICAL,
        self::CATEGORY_TOOLS,
        self::CATEGORY_SOFT_SKILLS,
        self::CATEGORY_DOMAIN,
        self::CATEGORY_LANGUAGES,
    ];

    /**
     * Master list: [label, category] tuples.
     */
    private const SKILLS = [
        // Programming languages
        ['JavaScript', self::CATEGORY_TECHNICAL],
        ['TypeScript', self::CATEGORY_TECHNICAL],
        ['Python', self::CATEGORY_TECHNICAL],
        ['Java', self::CATEGORY_TECHNICAL],
        ['C', self::CATEGORY_TECHNICAL],
        ['C++', self::CATEGORY_TECHNICAL],
        ['C#', self::CATEGORY_TECHNICAL],
        ['Go', self::CATEGORY_TECHNICAL],
        ['Golang', self::CATEGORY_TECHNICAL],
        ['Rust', self::CATEGORY_TECHNICAL],
        ['Ruby', self::CATEGORY_TECHNICAL],
        ['PHP', self::CATEGORY_TECHNICAL],
        ['Swift', self::CATEGORY_TECHNICAL],
        ['Kotlin', self::CATEGORY_TECHNICAL],
        ['Scala', self::CATEGORY_TECHNICAL],
        ['Perl', self::CATEGORY_TECHNICAL],
        ['R', self::CATEGORY_TECHNICAL],
        ['MATLAB', self::CATEGORY_TECHNICAL],
        ['Dart', self::CATEGORY_TECHNICAL],
        ['Objective-C', self::CATEGORY_TECHNICAL],
        ['Elixir', self::CATEGORY_TECHNICAL],
        ['Haskell', self::CATEGORY_TECHNICAL],
        ['Clojure', self::CATEGORY_TECHNICAL],
        ['Lua', self::CATEGORY_TECHNICAL],
        ['Shell', self::CATEGORY_TECHNICAL],
        ['Bash', self::CATEGORY_TECHNICAL],
        ['PowerShell', self::CATEGORY_TECHNICAL],
        ['SQL', self::CATEGORY_TECHNICAL],
        ['PL/SQL', self::CATEGORY_TECHNICAL],
        ['T-SQL', self::CATEGORY_TECHNICAL],

        // Frameworks
        ['React', self::CATEGORY_TECHNICAL],
        ['Next.js', self::CATEGORY_TECHNICAL],
        ['Vue', self::CATEGORY_TECHNICAL],
        ['Vue.js', self::CATEGORY_TECHNICAL],
        ['Nuxt', self::CATEGORY_TECHNICAL],
        ['Angular', self::CATEGORY_TECHNICAL],
        ['Svelte', self::CATEGORY_TECHNICAL],
        ['SvelteKit', self::CATEGORY_TECHNICAL],
        ['Ember', self::CATEGORY_TECHNICAL],
        ['Backbone', self::CATEGORY_TECHNICAL],
        ['jQuery', self::CATEGORY_TECHNICAL],
        ['Node.js', self::CATEGORY_TECHNICAL],
        ['Express', self::CATEGORY_TECHNICAL],
        ['Express.js', self::CATEGORY_TECHNICAL],
        ['NestJS', self::CATEGORY_TECHNICAL],
        ['Fastify', self::CATEGORY_TECHNICAL],
        ['Koa', self::CATEGORY_TECHNICAL],
        ['Deno', self::CATEGORY_TECHNICAL],
        ['Bun', self::CATEGORY_TECHNICAL],
        ['Django', self::CATEGORY_TECHNICAL],
        ['Flask', self::CATEGORY_TECHNICAL],
        ['FastAPI', self::CATEGORY_TECHNICAL],
        ['Pyramid', self::CATEGORY_TECHNICAL],
        ['Spring', self::CATEGORY_TECHNICAL],
        ['Spring Boot', self::CATEGORY_TECHNICAL],
        ['Hibernate', self::CATEGORY_TECHNICAL],
        ['Rails', self::CATEGORY_TECHNICAL],
        ['Ruby on Rails', self::CATEGORY_TECHNICAL],
        ['Sinatra', self::CATEGORY_TECHNICAL],
        ['Laravel', self::CATEGORY_TECHNICAL],
        ['Symfony', self::CATEGORY_TECHNICAL],
        ['CodeIgniter', self::CATEGORY_TECHNICAL],
        ['ASP.NET', self::CATEGORY_TECHNICAL],
        ['.NET', self::CATEGORY_TECHNICAL],
        ['.NET Core', self::CATEGORY_TECHNICAL],
        ['Unity', self::CATEGORY_TECHNICAL],
        ['Unreal Engine', self::CATEGORY_TECHNICAL],
        ['Qt', self::CATEGORY_TECHNICAL],
        ['Flutter', self::CATEGORY_TECHNICAL],
        ['React Native', self::CATEGORY_TECHNICAL],
        ['Ionic', self::CATEGORY_TECHNICAL],
        ['Electron', self::CATEGORY_TECHNICAL],
        ['Tailwind CSS', self::CATEGORY_TECHNICAL],
        ['Bootstrap', self::CATEGORY_TECHNICAL],
        ['Material UI', self::CATEGORY_TECHNICAL],
        ['Bulma', self::CATEGORY_TECHNICAL],
        ['Sass', self::CATEGORY_TECHNICAL],
        ['SCSS', self::CATEGORY_TECHNICAL],
        ['LESS', self::CATEGORY_TECHNICAL],
        ['Styled Components', self::CATEGORY_TECHNICAL],
        ['Redux', self::CATEGORY_TECHNICAL],
        ['Zustand', self::CATEGORY_TECHNICAL],
        ['MobX', self::CATEGORY_TECHNICAL],
        ['Recoil', self::CATEGORY_TECHNICAL],
        ['GraphQL', self::CATEGORY_TECHNICAL],
        ['Apollo', self::CATEGORY_TECHNICAL],
        ['Relay', self::CATEGORY_TECHNICAL],
        ['gRPC', self::CATEGORY_TECHNICAL],
        ['REST', self::CATEGORY_TECHNICAL],
        ['OpenAPI', self::CATEGORY_TECHNICAL],
        ['Swagger', self::CATEGORY_TECHNICAL],
        ['WebSockets', self::CATEGORY_TECHNICAL],
        ['Socket.IO', self::CATEGORY_TECHNICAL],

        // Data / ML
        ['Pandas', self::CATEGORY_TECHNICAL],
        ['NumPy', self::CATEGORY_TECHNICAL],
        ['SciPy', self::CATEGORY_TECHNICAL],
        ['Scikit-learn', self::CATEGORY_TECHNICAL],
        ['sklearn', self::CATEGORY_TECHNICAL],
        ['TensorFlow', self::CATEGORY_TECHNICAL],
        ['Keras', self::CATEGORY_TECHNICAL],
        ['PyTorch', self::CATEGORY_TECHNICAL],
        ['JAX', self::CATEGORY_TECHNICAL],
        ['Hugging Face', self::CATEGORY_TECHNICAL],
        ['Transformers', self::CATEGORY_TECHNICAL],
        ['spaCy', self::CATEGORY_TECHNICAL],
        ['NLTK', self::CATEGORY_TECHNICAL],
        ['OpenCV', self::CATEGORY_TECHNICAL],
        ['Matplotlib', self::CATEGORY_TECHNICAL],
        ['Seaborn', self::CATEGORY_TECHNICAL],
        ['Plotly', self::CATEGORY_TECHNICAL],
        ['Bokeh', self::CATEGORY_TECHNICAL],
        ['Tableau', self::CATEGORY_TOOLS],
        ['Power BI', self::CATEGORY_TOOLS],
        ['Looker', self::CATEGORY_TOOLS],
        ['Spark', self::CATEGORY_TECHNICAL],
        ['Apache Spark', self::CATEGORY_TECHNICAL],
        ['Hadoop', self::CATEGORY_TECHNICAL],
        ['Kafka', self::CATEGORY_TECHNICAL],
        ['Apache Kafka', self::CATEGORY_TECHNICAL],
        ['Airflow', self::CATEGORY_TECHNICAL],
        ['Apache Airflow', self::CATEGORY_TECHNICAL],
        ['Databricks', self::CATEGORY_TOOLS],
        ['dbt', self::CATEGORY_TOOLS],
        ['Snowflake', self::CATEGORY_TOOLS],
        ['BigQuery', self::CATEGORY_TOOLS],
        ['Redshift', self::CATEGORY_TOOLS],
        ['Elasticsearch', self::CATEGORY_TECHNICAL],
        ['Logstash', self::CATEGORY_TECHNICAL],
        ['Kibana', self::CATEGORY_TECHNICAL],
        ['Machine Learning', self::CATEGORY_DOMAIN],
        ['Deep Learning', self::CATEGORY_DOMAIN],
        ['NLP', self::CATEGORY_DOMAIN],
        ['Natural Language Processing', self::CATEGORY_DOMAIN],
        ['Computer Vision', self::CATEGORY_DOMAIN],
        ['Reinforcement Learning', self::CATEGORY_DOMAIN],
        ['Data Engineering', self::CATEGORY_DOMAIN],
        ['Data Science', self::CATEGORY_DOMAIN],
        ['Data Analysis', self::CATEGORY_DOMAIN],
        ['Data Visualization', self::CATEGORY_DOMAIN],
        ['Statistics', self::CATEGORY_DOMAIN],
        ['A/B Testing', self::CATEGORY_DOMAIN],
        ['Time Series Analysis', self::CATEGORY_DOMAIN],
        ['MLOps', self::CATEGORY_DOMAIN],

        // Cloud / DevOps
        ['AWS', self::CATEGORY_TOOLS],
        ['Amazon Web Services', self::CATEGORY_TOOLS],
        ['EC2', self::CATEGORY_TOOLS],
        ['S3', self::CATEGORY_TOOLS],
        ['Lambda', self::CATEGORY_TOOLS],
        ['RDS', self::CATEGORY_TOOLS],
        ['CloudFormation', self::CATEGORY_TOOLS],
        ['GCP', self::CATEGORY_TOOLS],
        ['Google Cloud', self::CATEGORY_TOOLS],
        ['Azure', self::CATEGORY_TOOLS],
        ['Microsoft Azure', self::CATEGORY_TOOLS],
        ['Docker', self::CATEGORY_TOOLS],
        ['Kubernetes', self::CATEGORY_TOOLS],
        ['Helm', self::CATEGORY_TOOLS],
        ['Terraform', self::CATEGORY_TOOLS],
        ['Ansible', self::CATEGORY_TOOLS],
        ['Puppet', self::CATEGORY_TOOLS],
        ['Chef', self::CATEGORY_TOOLS],
        ['Jenkins', self::CATEGORY_TOOLS],
        ['GitHub Actions', self::CATEGORY_TOOLS],
        ['GitLab CI', self::CATEGORY_TOOLS],
        ['CircleCI', self::CATEGORY_TOOLS],
        ['Travis CI', self::CATEGORY_TOOLS],
        ['Vagrant', self::CATEGORY_TOOLS],
        ['Packer', self::CATEGORY_TOOLS],
        ['Nginx', self::CATEGORY_TOOLS],
        ['Apache', self::CATEGORY_TOOLS],
        ['HAProxy', self::CATEGORY_TOOLS],
        ['Envoy', self::CATEGORY_TOOLS],
        ['Istio', self::CATEGORY_TOOLS],
        ['Prometheus', self::CATEGORY_TOOLS],
        ['Grafana', self::CATEGORY_TOOLS],
        ['Datadog', self::CATEGORY_TOOLS],
        ['New Relic', self::CATEGORY_TOOLS],
        ['Sentry', self::CATEGORY_TOOLS],
        ['Linux', self::CATEGORY_TOOLS],
        ['Unix', self::CATEGORY_TOOLS],
        ['systemd', self::CATEGORY_TOOLS],
        ['CI/CD', self::CATEGORY_DOMAIN],
        ['DevOps', self::CATEGORY_DOMAIN],
        ['Site Reliability Engineering', self::CATEGORY_DOMAIN],
        ['SRE', self::CATEGORY_DOMAIN],
        ['Microservices', self::CATEGORY_DOMAIN],
        ['Distributed Systems', self::CATEGORY_DOMAIN],
        ['System Design', self::CATEGORY_DOMAIN],
        ['Observability', self::CATEGORY_DOMAIN],

        // Databases
        ['PostgreSQL', self::CATEGORY_TOOLS],
        ['Postgres', self::CATEGORY_TOOLS],
        ['MySQL', self::CATEGORY_TOOLS],
        ['MariaDB', self::CATEGORY_TOOLS],
        ['SQLite', self::CATEGORY_TOOLS],
        ['MongoDB', self::CATEGORY_TOOLS],
        ['Redis', self::CATEGORY_TOOLS],
        ['DynamoDB', self::CATEGORY_TOOLS],
        ['Cassandra', self::CATEGORY_TOOLS],
        ['CouchDB', self::CATEGORY_TOOLS],
        ['Couchbase', self::CATEGORY_TOOLS],
        ['Neo4j', self::CATEGORY_TOOLS],
        ['Neo4j Graph', self::CATEGORY_TOOLS],
        ['MongoDB Atlas', self::CATEGORY_TOOLS],
        ['Prisma', self::CATEGORY_TOOLS],
        ['ORM', self::CATEGORY_TECHNICAL],
        ['Sequelize', self::CATEGORY_TOOLS],
        ['TypeORM', self::CATEGORY_TOOLS],
        ['SQLAlchemy', self::CATEGORY_TOOLS],
        ['Mongoose', self::CATEGORY_TOOLS],
        ['Drizzle', self::CATEGORY_TOOLS],

        // Tools & platforms
        ['Git', self::CATEGORY_TOOLS],
        ['GitHub', self::CATEGORY_TOOLS],
        ['GitLab', self::CATEGORY_TOOLS],
        ['Bitbucket', self::CATEGORY_TOOLS],
        ['Jira', self::CATEGORY_TOOLS],
        ['Confluence', self::CATEGORY_TOOLS],
        ['Trello', self::CATEGORY_TOOLS],
        ['Asana', self::CATEGORY_TOOLS],
        ['Notion', self::CATEGORY_TOOLS],
        ['Slack', self::CATEGORY_TOOLS],
        ['Figma', self::CATEGORY_TOOLS],
        ['Sketch', self::CATEGORY_TOOLS],
        ['Adobe XD', self::CATEGORY_TOOLS],
        ['Photoshop', self::CATEGORY_TOOLS],
        ['Illustrator', self::CATEGORY_TOOLS],
        ['InDesign', self::CATEGORY_TOOLS],
        ['After Effects', self::CATEGORY_TOOLS],
        ['Premiere', self::CATEGORY_TOOLS],
        ['VS Code', self::CATEGORY_TOOLS],
        ['Visual Studio', self::CATEGORY_TOOLS],
        ['IntelliJ', self::CATEGORY_TOOLS],
        ['Eclipse', self::CATEGORY_TOOLS],
        ['Vim', self::CATEGORY_TOOLS],
        ['Emacs', self::CATEGORY_TOOLS],
        ['Postman', self::CATEGORY_TOOLS],
        ['Insomnia', self::CATEGORY_TOOLS],
        ['cURL', self::CATEGORY_TOOLS],
        ['Wireshark', self::CATEGORY_TOOLS],
        ['Linux administration', self::CATEGORY_TOOLS],

        // Soft skills
        ['Leadership', self::CATEGORY_SOFT_SKILLS],
        ['Team Leadership', self::CATEGORY_SOFT_SKILLS],
        ['Communication', self::CATEGORY_SOFT_SKILLS],
        ['Verbal Communication', self::CATEGORY_SOFT_SKILLS],
        ['Written Communication', self::CATEGORY_SOFT_SKILLS],
        ['Collaboration', self::CATEGORY_SOFT_SKILLS],
        ['Teamwork', self::CATEGORY_SOFT_SKILLS],
        ['Cross-functional Collaboration', self::CATEGORY_SOFT_SKILLS],
        ['Problem Solving', self::CATEGORY_SOFT_SKILLS],
        ['Critical Thinking', self::CATEGORY_SOFT_SKILLS],
        ['Analytical Skills', self::CATEGORY_SOFT_SKILLS],
        ['Creativity', self::CATEGORY_SOFT_SKILLS],
        ['Innovation', self::CATEGORY_SOFT_SKILLS],
        ['Adaptability', self::CATEGORY_SOFT_SKILLS],
        ['Flexibility', self::CATEGORY_SOFT_SKILLS],
        ['Time Management', self::CATEGORY_SOFT_SKILLS],
        ['Prioritization', self::CATEGORY_SOFT_SKILLS],
        ['Organization', self::CATEGORY_SOFT_SKILLS],
        ['Attention to Detail', self::CATEGORY_SOFT_SKILLS],
        ['Decision Making', self::CATEGORY_SOFT_SKILLS],
        ['Conflict Resolution', self::CATEGORY_SOFT_SKILLS],
        ['Negotiation', self::CATEGORY_SOFT_SKILLS],
        ['Presentation Skills', self::CATEGORY_SOFT_SKILLS],
        ['Public Speaking', self::CATEGORY_SOFT_SKILLS],
        ['Mentorship', self::CATEGORY_SOFT_SKILLS],
        ['Coaching', self::CATEGORY_SOFT_SKILLS],
        ['Empathy', self::CATEGORY_SOFT_SKILLS],
        ['Emotional Intelligence', self::CATEGORY_SOFT_SKILLS],
        ['Self-motivated', self::CATEGORY_SOFT_SKILLS],
        ['Self-starter', self::CATEGORY_SOFT_SKILLS],
        ['Initiative', self::CATEGORY_SOFT_SKILLS],
        ['Ownership', self::CATEGORY_SOFT_SKILLS],
        ['Accountability', self::CATEGORY_SOFT_SKILLS],
        ['Stakeholder Management', self::CATEGORY_SOFT_SKILLS],
        ['Customer Focus', self::CATEGORY_SOFT_SKILLS],
        ['Customer Service', self::CATEGORY_SOFT_SKILLS],
        ['Project Management', self::CATEGORY_SOFT_SKILLS],
        ['Agile', self::CATEGORY_SOFT_SKILLS],
        ['Scrum', self::CATEGORY_SOFT_SKILLS],
        ['Kanban', self::CATEGORY_SOFT_SKILLS],
        ['Product Management', self::CATEGORY_DOMAIN],
        ['Strategic Planning', self::CATEGORY_SOFT_SKILLS],
        ['Budgeting', self::CATEGORY_SOFT_SKILLS],
        ['Forecasting', self::CATEGORY_SOFT_SKILLS],
        ['Risk Management', self::CATEGORY_SOFT_SKILLS],

        // Domain
        ['Software Engineering', self::CATEGORY_DOMAIN],
        ['Web Development', self::CATEGORY_DOMAIN],
        ['Frontend Development', self::CATEGORY_DOMAIN],
        ['Backend Development', self::CATEGORY_DOMAIN],
        ['Full Stack Development', self::CATEGORY_DOMAIN],
        ['Mobile Development', self::CATEGORY_DOMAIN],
        ['iOS Development', self::CATEGORY_DOMAIN],
        ['Android Development', self::CATEGORY_DOMAIN],
        ['Game Development', self::CATEGORY_DOMAIN],
        ['Embedded Systems', self::CATEGORY_DOMAIN],
        ['IoT', self::CATEGORY_DOMAIN],
        ['Internet of Things', self::CATEGORY_DOMAIN],
        ['Cybersecurity', self::CATEGORY_DOMAIN],
        ['Information Security', self::CATEGORY_DOMAIN],
        ['Penetration Testing', self::CATEGORY_DOMAIN],
        ['Cryptography', self::CATEGORY_DOMAIN],
        ['Blockchain', self::CATEGORY_DOMAIN],
        ['Smart Contracts', self::CATEGORY_DOMAIN],
        ['Solidity', self::CATEGORY_TECHNICAL],
        ['Web3', self::CATEGORY_DOMAIN],
        ['Fintech', self::CATEGORY_DOMAIN],
        ['Healthcare IT', self::CATEGORY_DOMAIN],
        ['HIPAA', self::CATEGORY_DOMAIN],
        ['GDPR', self::CATEGORY_DOMAIN],
        ['PCI DSS', self::CATEGORY_DOMAIN],
        ['SOX', self::CATEGORY_DOMAIN],
        ['E-commerce', self::CATEGORY_DOMAIN],
        ['SEO', self::CATEGORY_DOMAIN],
        ['SEM', self::CATEGORY_DOMAIN],
        ['Digital Marketing', self::CATEGORY_DOMAIN],
        ['Content Marketing', self::CATEGORY_DOMAIN],
        ['Email Marketing', self::CATEGORY_DOMAIN],
        ['Social Media Marketing', self::CATEGORY_DOMAIN],
        ['Brand Management', self::CATEGORY_DOMAIN],
        ['UX Design', self::CATEGORY_DOMAIN],
        ['UI Design', self::CATEGORY_DOMAIN],
        ['User Research', self::CATEGORY_DOMAIN],
        ['Wireframing', self::CATEGORY_DOMAIN],
        ['Prototyping', self::CATEGORY_DOMAIN],
        ['Accessibility', self::CATEGORY_DOMAIN],
        ['Information Architecture', self::CATEGORY_DOMAIN],
        ['Agile Methodologies', self::CATEGORY_DOMAIN],
        ['Test-Driven Development', self::CATEGORY_DOMAIN],
        ['TDD', self::CATEGORY_DOMAIN],
        ['Behavior-Driven Development', self::CATEGORY_DOMAIN],
        ['BDD', self::CATEGORY_DOMAIN],
        ['Continuous Integration', self::CATEGORY_DOMAIN],
        ['Continuous Deployment', self::CATEGORY_DOMAIN],

        // Human languages
        ['English', self::CATEGORY_LANGUAGES],
        ['Mandarin', self::CATEGORY_LANGUAGES],
        ['Chinese', self::CATEGORY_LANGUAGES],
        ['Spanish', self::CATEGORY_LANGUAGES],
        ['French', self::CATEGORY_LANGUAGES],
        ['German', self::CATEGORY_LANGUAGES],
        ['Italian', self::CATEGORY_LANGUAGES],
        ['Portuguese', self::CATEGORY_LANGUAGES],
        ['Russian', self::CATEGORY_LANGUAGES],
        ['Japanese', self::CATEGORY_LANGUAGES],
        ['Korean', self::CATEGORY_LANGUAGES],
        ['Arabic', self::CATEGORY_LANGUAGES],
        ['Hindi', self::CATEGORY_LANGUAGES],
        ['Bengali', self::CATEGORY_LANGUAGES],
        ['Urdu', self::CATEGORY_LANGUAGES],
        ['Turkish', self::CATEGORY_LANGUAGES],
        ['Dutch', self::CATEGORY_LANGUAGES],
        ['Polish', self::CATEGORY_LANGUAGES],
        ['Vietnamese', self::CATEGORY_LANGUAGES],
        ['Thai', self::CATEGORY_LANGUAGES],
    ];

    /** @var array<int, array{raw: string, category: string, normalized: string}> */
    private static ?array $compiled = null;

    public static function total(): int
    {
        return count(self::SKILLS);
    }

    /**
     * Whole-word case-insensitive scan of the text for any curated skill.
     * Returns a deduped list (preferring the longest raw label when two
     * skills normalize to the same key) + per-category buckets.
     *
     * @return array{skills: list<string>, categories: array<string, list<string>>}
     */
    public static function extract(string $text): array
    {
        $compiled = self::compiled();
        $flat = self::flatten($text);
        $found = []; // raw => category

        foreach ($compiled as $skill) {
            if ($skill['normalized'] === '') {
                continue;
            }
            if (str_contains($flat, $skill['normalized'])) {
                $found[$skill['raw']] = $skill['category'] ?? self::CATEGORY_TECHNICAL;
            }
        }

        // Dedupe by normalized form, preferring the longest raw label.
        $byNormalized = []; // normalized => {raw, category}
        foreach ($found as $raw => $category) {
            $norm = self::normalize($raw);
            if (! isset($byNormalized[$norm]) || strlen($raw) > strlen($byNormalized[$norm]['raw'])) {
                $byNormalized[$norm] = ['raw' => $raw, 'category' => $category];
            }
        }

        $categories = self::emptyCategories();
        $skills = [];
        foreach ($byNormalized as $entry) {
            $skills[] = $entry['raw'];
            $categories[$entry['category']][] = $entry['raw'];
        }

        foreach ($categories as $cat => $list) {
            sort($list);
            $categories[$cat] = $list;
        }
        sort($skills);

        return ['skills' => $skills, 'categories' => $categories];
    }

    /**
     * Map an arbitrary skill label to one of the 5 categories.
     * Falls back to "Technical" if unknown.
     */
    public static function categorize(string $skill): string
    {
        $norm = self::normalize($skill);
        if ($norm === '') {
            return self::CATEGORY_TECHNICAL;
        }

        foreach (self::compiled() as $entry) {
            if ($entry['normalized'] === $norm) {
                return $entry['category'];
            }
        }

        // Heuristics for unknown skills.
        $lower = strtolower($skill);
        if (preg_match('/(manage|communicat|leadership|teamwork|collab|negoti|present|mentor|coach)/', $lower)) {
            return self::CATEGORY_SOFT_SKILLS;
        }
        if (preg_match('/(market|brand|seo|content|sales|customer)/', $lower)) {
            return self::CATEGORY_DOMAIN;
        }
        if (preg_match('/(english|spanish|french|german|chinese|japanese|korean|arabic|hindi)/', $lower)) {
            return self::CATEGORY_LANGUAGES;
        }
        if (preg_match('/(aws|docker|kubernetes|git|jenkins|figma|jira|tableau|power bi)/', $lower)) {
            return self::CATEGORY_TOOLS;
        }
        return self::CATEGORY_TECHNICAL;
    }

    /**
     * @return array<string, list<string>>
     */
    public static function emptyCategories(): array
    {
        return [
            self::CATEGORY_TECHNICAL => [],
            self::CATEGORY_TOOLS => [],
            self::CATEGORY_SOFT_SKILLS => [],
            self::CATEGORY_DOMAIN => [],
            self::CATEGORY_LANGUAGES => [],
        ];
    }

    private static function normalize(string $label): string
    {
        return preg_replace('/[^a-z0-9]+/', '', strtolower($label)) ?? '';
    }

    private static function flatten(string $text): string
    {
        return preg_replace('/[^a-z0-9]+/', ' ', strtolower($text)) ?? '';
    }

    /**
     * @return array<int, array{raw: string, category: string, normalized: string}>
     */
    private static function compiled(): array
    {
        if (self::$compiled === null) {
            $out = [];
            foreach (self::SKILLS as [$raw, $category]) {
                $out[] = [
                    'raw' => $raw,
                    'category' => $category,
                    'normalized' => self::normalize($raw),
                ];
            }
            self::$compiled = $out;
        }
        return self::$compiled;
    }
}
