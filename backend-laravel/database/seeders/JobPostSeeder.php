<?php

namespace Database\Seeders;

use App\Models\JobPost;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * 100 skill-based job posts spanning backend, frontend, mobile, DevOps, data,
 * ML, security, QA, design, product, marketing and specialised engineering.
 *
 * Every skill label is drawn from SkillsDictionary, so both matching paths work
 * against this data: the AI path scores the description semantically, and the
 * deterministic fallback can still resolve the required skills by exact match.
 *
 * Idempotent — re-running updates the existing post with the same title rather
 * than inserting duplicates.
 */
class JobPostSeeder extends Seeder
{
    /** Jobs are distributed round-robin across these recruiters. */
    private const RECRUITERS = [
        ['name' => 'Bytecraft Talent', 'email' => 'hiring@bytecraft.example'],
        ['name' => 'Northwind Digital', 'email' => 'jobs@northwind.example'],
        ['name' => 'Meridian Labs', 'email' => 'careers@meridianlabs.example'],
        ['name' => 'Skyline Systems', 'email' => 'recruit@skylinesys.example'],
        ['name' => 'Harbour Analytics', 'email' => 'talent@harbour.example'],
    ];

    /**
     * @var list<array{title: string, description: string, skills: list<string>}>
     */
    private const JOBS = [
        // ---------- Backend ----------
        [
            'title' => 'Senior Laravel Developer',
            'description' => 'Own the PHP services behind our billing and reporting platform. You will design REST endpoints, tune slow MySQL queries, and introduce Redis caching where it measurably helps. Expect to mentor two mid-level engineers and review most backend pull requests.',
            'skills' => ['PHP', 'Laravel', 'MySQL', 'Redis', 'REST', 'Docker', 'Mentorship'],
        ],
        [
            'title' => 'Node.js Backend Engineer',
            'description' => 'Build and operate the Node services that power our customer-facing API. The stack is TypeScript on Express with MongoDB, deployed as containers. You will be on a light on-call rotation for the services you write.',
            'skills' => ['Node.js', 'Express', 'TypeScript', 'MongoDB', 'REST', 'Docker'],
        ],
        [
            'title' => 'Python Django Developer',
            'description' => 'Work on a mature Django monolith serving a logistics marketplace. Responsibilities include modelling new domains, writing migrations that run safely against a large PostgreSQL database, and improving test coverage.',
            'skills' => ['Python', 'Django', 'PostgreSQL', 'REST', 'Docker', 'Test-Driven Development'],
        ],
        [
            'title' => 'Go Microservices Engineer',
            'description' => 'Split a monolith into well-bounded Go services communicating over gRPC. You will define service contracts, set sensible timeouts and retries, and run everything on Kubernetes.',
            'skills' => ['Go', 'gRPC', 'Microservices', 'Kubernetes', 'Docker', 'Distributed Systems'],
        ],
        [
            'title' => 'Java Spring Boot Engineer',
            'description' => 'Develop transactional services for a payments platform using Spring Boot and Hibernate. Events flow through Kafka; correctness and idempotency matter more than raw throughput here.',
            'skills' => ['Java', 'Spring Boot', 'Hibernate', 'PostgreSQL', 'Kafka', 'Microservices'],
        ],
        [
            'title' => 'Ruby on Rails Developer',
            'description' => 'Maintain and extend a Rails application used daily by several thousand operators. You will pay down technical debt deliberately, keep the test suite fast, and ship small changes often.',
            'skills' => ['Ruby', 'Ruby on Rails', 'PostgreSQL', 'Redis', 'Test-Driven Development'],
        ],
        [
            'title' => '.NET Core Backend Developer',
            'description' => 'Build ASP.NET Core services for an insurance underwriting product. The data layer is heavily stored-procedure driven, so comfort with T-SQL is essential. Deployment is to Azure App Service.',
            'skills' => ['C#', '.NET Core', 'ASP.NET', 'T-SQL', 'Azure', 'REST'],
        ],
        [
            'title' => 'NestJS API Developer',
            'description' => 'Design a typed GraphQL and REST surface on NestJS backed by PostgreSQL through Prisma. You will own schema design decisions and the migration strategy as the product evolves.',
            'skills' => ['TypeScript', 'NestJS', 'GraphQL', 'PostgreSQL', 'Prisma', 'REST'],
        ],
        [
            'title' => 'FastAPI Python Engineer',
            'description' => 'Serve internal machine learning models behind fast, well-documented HTTP endpoints. FastAPI with async PostgreSQL access, packaged in Docker and described with OpenAPI.',
            'skills' => ['Python', 'FastAPI', 'PostgreSQL', 'Docker', 'OpenAPI', 'REST'],
        ],
        [
            'title' => 'Elixir Backend Developer',
            'description' => 'Work on a soft-realtime messaging backend written in Elixir. You should be comfortable reasoning about supervision trees, process isolation and back-pressure under load.',
            'skills' => ['Elixir', 'PostgreSQL', 'Distributed Systems', 'WebSockets', 'Problem Solving'],
        ],
        [
            'title' => 'Rust Systems Engineer',
            'description' => 'Write low-latency data-plane components in Rust. This role sits close to the operating system: memory layout, syscalls and profiling are part of the daily work.',
            'skills' => ['Rust', 'C++', 'Linux', 'Distributed Systems', 'System Design'],
        ],
        [
            'title' => 'Symfony PHP Engineer',
            'description' => 'Extend a Symfony-based content platform used by publishing clients across Europe. You will work on the domain model, background workers and the admin tooling around them.',
            'skills' => ['PHP', 'Symfony', 'MySQL', 'Docker', 'REST'],
        ],
        [
            'title' => 'GraphQL API Engineer',
            'description' => 'Own our federated GraphQL layer: schema stitching, resolver performance, and the caching strategy in front of it. You will work closely with the frontend teams that consume it.',
            'skills' => ['GraphQL', 'Apollo', 'Node.js', 'TypeScript', 'REST', 'System Design'],
        ],
        [
            'title' => 'Scala Data Backend Engineer',
            'description' => 'Build the Scala services that sit between our Spark pipelines and the product. Streaming ingestion runs through Kafka; the results land in a warehouse the analytics team queries.',
            'skills' => ['Scala', 'Apache Spark', 'Kafka', 'SQL', 'Data Engineering'],
        ],

        // ---------- Frontend ----------
        [
            'title' => 'Senior React Developer',
            'description' => 'Lead frontend work on our analytics dashboard. Expect complex state, large tables, and a real obligation to keep the interface usable with a keyboard and a screen reader.',
            'skills' => ['React', 'TypeScript', 'Redux', 'Tailwind CSS', 'Accessibility', 'Team Leadership'],
        ],
        [
            'title' => 'Next.js Frontend Engineer',
            'description' => 'Build marketing and product surfaces in Next.js where page speed directly affects revenue. You will own Core Web Vitals, rendering strategy per route, and the technical side of SEO.',
            'skills' => ['Next.js', 'React', 'TypeScript', 'Tailwind CSS', 'SEO', 'Web Development'],
        ],
        [
            'title' => 'Vue.js Developer',
            'description' => 'Develop the customer portal in Vue 3 with Nuxt for server rendering. The design system is shared with another team, so componentisation and clear props matter.',
            'skills' => ['Vue.js', 'Nuxt', 'JavaScript', 'Sass', 'Frontend Development'],
        ],
        [
            'title' => 'Angular Application Developer',
            'description' => 'Maintain a large Angular application in the healthcare space. Strong typing, reactive patterns and careful state management keep this codebase manageable.',
            'skills' => ['Angular', 'TypeScript', 'SCSS', 'REST', 'Healthcare IT'],
        ],
        [
            'title' => 'Svelte Frontend Engineer',
            'description' => 'Rebuild our onboarding flow in SvelteKit. The brief is a fast, small bundle and interactions that feel immediate on low-end mobile hardware.',
            'skills' => ['Svelte', 'SvelteKit', 'TypeScript', 'Sass', 'Frontend Development'],
        ],
        [
            'title' => 'Frontend Accessibility Specialist',
            'description' => 'Audit and remediate accessibility issues across our React products, then help teams stop reintroducing them. You will run testing sessions with assistive technology users.',
            'skills' => ['Accessibility', 'React', 'UX Design', 'User Research', 'Written Communication'],
        ],
        [
            'title' => 'UI Engineer (Design System)',
            'description' => 'Build and document the shared component library that six product teams depend on. This is equal parts engineering, API design and working closely with designers in Figma.',
            'skills' => ['React', 'Styled Components', 'Figma', 'UI Design', 'Accessibility'],
        ],

        // ---------- Mobile ----------
        [
            'title' => 'React Native Mobile Developer',
            'description' => 'Ship a single React Native codebase to both stores. You will handle native module integration, over-the-air updates, and the platform differences that inevitably leak through.',
            'skills' => ['React Native', 'JavaScript', 'iOS Development', 'Android Development', 'Mobile Development'],
        ],
        [
            'title' => 'Flutter Mobile Engineer',
            'description' => 'Build a Flutter application for field technicians that must work offline for hours at a time. Local persistence and conflict resolution on sync are the central problems.',
            'skills' => ['Flutter', 'Dart', 'Mobile Development', 'SQLite', 'Problem Solving'],
        ],
        [
            'title' => 'iOS Engineer (Swift)',
            'description' => 'Own our iOS app end to end. Modern Swift with some Objective-C interop remaining in older modules; you will drive the plan for retiring it.',
            'skills' => ['Swift', 'iOS Development', 'Objective-C', 'Mobile Development', 'Ownership'],
        ],
        [
            'title' => 'Android Engineer (Kotlin)',
            'description' => 'Develop our Android application in Kotlin, with a slice of legacy Java still in place. Battery and background-work behaviour are a recurring focus.',
            'skills' => ['Kotlin', 'Android Development', 'Java', 'Mobile Development', 'Attention to Detail'],
        ],

        // ---------- Full stack ----------
        [
            'title' => 'Full Stack JavaScript Developer',
            'description' => 'Work across a Node and React codebase for a booking product. You will pick up whatever the feature needs, from schema change to interface polish.',
            'skills' => ['Node.js', 'React', 'Express', 'MongoDB', 'Full Stack Development'],
        ],
        [
            'title' => 'Full Stack PHP Developer',
            'description' => 'Build features end to end on a Laravel backend with a Vue frontend. Small team, so you will also touch deployment and the occasional database migration under load.',
            'skills' => ['PHP', 'Laravel', 'Vue.js', 'MySQL', 'Full Stack Development'],
        ],
        [
            'title' => 'Full Stack Python Developer',
            'description' => 'Django on the server, React in the browser, PostgreSQL underneath. You will be trusted to make product-shaped decisions, not just implement tickets.',
            'skills' => ['Python', 'Django', 'React', 'PostgreSQL', 'Full Stack Development'],
        ],
        [
            'title' => 'MERN Stack Developer',
            'description' => 'Deliver features across MongoDB, Express, React and Node for an early-stage marketplace. Expect to move quickly and revisit decisions as the product finds its shape.',
            'skills' => ['MongoDB', 'Express', 'React', 'Node.js', 'Full Stack Development'],
        ],

        // ---------- DevOps / SRE / Cloud ----------
        [
            'title' => 'DevOps Engineer',
            'description' => 'Own build and deployment pipelines across a dozen services. Containers on Kubernetes, infrastructure in Terraform, and a strong preference for automation over runbooks.',
            'skills' => ['Docker', 'Kubernetes', 'Terraform', 'Jenkins', 'AWS', 'DevOps'],
        ],
        [
            'title' => 'Site Reliability Engineer',
            'description' => 'Define SLOs with product teams and hold the platform to them. You will improve alerting signal-to-noise, run blameless incident reviews, and automate the toil you find.',
            'skills' => ['SRE', 'Kubernetes', 'Prometheus', 'Grafana', 'Observability', 'Site Reliability Engineering'],
        ],
        [
            'title' => 'AWS Cloud Architect',
            'description' => 'Design multi-account AWS environments for regulated customers. Networking, identity boundaries and cost visibility are as important as the compute design.',
            'skills' => ['AWS', 'EC2', 'S3', 'Lambda', 'CloudFormation', 'System Design'],
        ],
        [
            'title' => 'Azure Cloud Engineer',
            'description' => 'Run our Azure estate: landing zones, policy, and the pipelines that deploy into them. Scripting in PowerShell is part of the daily routine.',
            'skills' => ['Azure', 'Terraform', 'PowerShell', 'CI/CD', 'Microsoft Azure'],
        ],
        [
            'title' => 'GCP Platform Engineer',
            'description' => 'Operate the Google Cloud platform underneath our analytics products, including the BigQuery estate and the GKE clusters that feed it.',
            'skills' => ['GCP', 'BigQuery', 'Kubernetes', 'Terraform', 'Google Cloud'],
        ],
        [
            'title' => 'Kubernetes Platform Engineer',
            'description' => 'Build the internal platform teams deploy onto: Helm charts, a service mesh, and sane defaults so product engineers do not need to become cluster experts.',
            'skills' => ['Kubernetes', 'Helm', 'Istio', 'Docker', 'Go', 'Envoy'],
        ],
        [
            'title' => 'CI/CD Automation Engineer',
            'description' => 'Cut our pipeline times and make failures legible. You will consolidate three CI systems into one and own the migration plan.',
            'skills' => ['GitHub Actions', 'Jenkins', 'GitLab CI', 'CI/CD', 'Bash', 'Continuous Integration'],
        ],
        [
            'title' => 'Infrastructure as Code Engineer',
            'description' => 'Bring the remaining click-configured infrastructure under Terraform, with Ansible for configuration and Packer for images. Drift detection is part of the mandate.',
            'skills' => ['Terraform', 'Ansible', 'Packer', 'AWS', 'DevOps'],
        ],
        [
            'title' => 'Linux Systems Administrator',
            'description' => 'Keep a fleet of Linux servers healthy: package management, systemd units, Nginx in front, and the scripting that ties it together.',
            'skills' => ['Linux', 'Bash', 'systemd', 'Nginx', 'Unix', 'Linux administration'],
        ],
        [
            'title' => 'Observability Engineer',
            'description' => 'Own metrics, logs and traces as one product. You will standardise instrumentation across services and make dashboards people actually use during incidents.',
            'skills' => ['Prometheus', 'Grafana', 'Datadog', 'New Relic', 'Observability', 'Sentry'],
        ],
        [
            'title' => 'Database Reliability Engineer',
            'description' => 'Keep PostgreSQL and MySQL fast and available under growth. Replication topology, backup verification and query regressions are your daily concerns.',
            'skills' => ['PostgreSQL', 'MySQL', 'Redis', 'SQL', 'Linux', 'Observability'],
        ],

        // ---------- Data ----------
        [
            'title' => 'Data Engineer',
            'description' => 'Build the batch and streaming pipelines that feed our warehouse. Spark for heavy transforms, Airflow for orchestration, Kafka for anything that cannot wait for a nightly run.',
            'skills' => ['Python', 'Apache Spark', 'Airflow', 'SQL', 'Kafka', 'Data Engineering'],
        ],
        [
            'title' => 'Analytics Engineer',
            'description' => 'Own the transformation layer in dbt on top of Snowflake. You will model messy source data into tables analysts can trust, and document them properly.',
            'skills' => ['dbt', 'SQL', 'Snowflake', 'Data Analysis', 'Data Engineering'],
        ],
        [
            'title' => 'Big Data Engineer',
            'description' => 'Work with petabyte-scale datasets on Spark and Hadoop. Partitioning strategy and job cost are constant considerations at this volume.',
            'skills' => ['Hadoop', 'Apache Spark', 'Scala', 'Kafka', 'Data Engineering'],
        ],
        [
            'title' => 'Data Warehouse Engineer',
            'description' => 'Design and maintain our Redshift warehouse: schema design, load performance, and the dbt models built on top of it.',
            'skills' => ['Redshift', 'SQL', 'dbt', 'Data Engineering', 'Data Analysis'],
        ],
        [
            'title' => 'Business Intelligence Developer',
            'description' => 'Turn warehouse tables into Power BI reports the commercial team relies on for weekly decisions. Accuracy and clear definitions matter more than visual flair.',
            'skills' => ['Power BI', 'SQL', 'Data Visualization', 'Data Analysis', 'Attention to Detail'],
        ],
        [
            'title' => 'Tableau Analytics Specialist',
            'description' => 'Build and maintain Tableau dashboards across finance and operations, and coach business users to self-serve where the data supports it.',
            'skills' => ['Tableau', 'SQL', 'Data Visualization', 'Data Analysis', 'Presentation Skills'],
        ],
        [
            'title' => 'Looker Analytics Developer',
            'description' => 'Own our LookML models and the semantic layer they define. You will be the arbiter of what a metric actually means across the company.',
            'skills' => ['Looker', 'SQL', 'Data Analysis', 'Data Visualization'],
        ],
        [
            'title' => 'Data Scientist',
            'description' => 'Answer commercial questions with data, from exploratory analysis through to models that reach production. You will be expected to explain your reasoning to non-technical stakeholders.',
            'skills' => ['Python', 'Pandas', 'Scikit-learn', 'Statistics', 'Data Science', 'Communication'],
        ],
        [
            'title' => 'Machine Learning Engineer',
            'description' => 'Take models from notebook to production service: training pipelines, evaluation harnesses, and the deployment path that keeps them fresh.',
            'skills' => ['Python', 'PyTorch', 'TensorFlow', 'MLOps', 'Machine Learning', 'Docker'],
        ],
        [
            'title' => 'NLP Engineer',
            'description' => 'Build text understanding features: entity extraction, classification and semantic search over a large document corpus.',
            'skills' => ['Python', 'Hugging Face', 'Transformers', 'spaCy', 'NLP', 'Natural Language Processing'],
        ],
        [
            'title' => 'Computer Vision Engineer',
            'description' => 'Develop vision models for automated quality inspection on a production line. Latency budgets are tight and lighting conditions are not friendly.',
            'skills' => ['Python', 'OpenCV', 'PyTorch', 'Computer Vision', 'Deep Learning'],
        ],
        [
            'title' => 'MLOps Engineer',
            'description' => 'Own the infrastructure that machine learning runs on: reproducible training, model registry, monitoring for drift, and safe rollout of new versions.',
            'skills' => ['MLOps', 'Kubernetes', 'Docker', 'Python', 'Machine Learning', 'Observability'],
        ],
        [
            'title' => 'Deep Learning Researcher',
            'description' => 'Run experiments at the edge of what our current architecture can do, and publish internally on what works. Strong empirical discipline required.',
            'skills' => ['PyTorch', 'JAX', 'Deep Learning', 'Reinforcement Learning', 'Statistics'],
        ],
        [
            'title' => 'Time Series Forecasting Analyst',
            'description' => 'Forecast demand across thousands of SKUs. Seasonality, promotions and supply disruptions all distort the signal you are modelling.',
            'skills' => ['Python', 'Statistics', 'Time Series Analysis', 'Pandas', 'Forecasting'],
        ],

        // ---------- Databases & search ----------
        [
            'title' => 'Elasticsearch Engineer',
            'description' => 'Own our search cluster end to end: index design, analyzers, relevance tuning, and the ingest pipeline feeding it.',
            'skills' => ['Elasticsearch', 'Logstash', 'Kibana', 'Java', 'Data Engineering'],
        ],
        [
            'title' => 'MongoDB Database Engineer',
            'description' => 'Design document schemas that survive contact with real access patterns, and operate the Atlas clusters behind them.',
            'skills' => ['MongoDB', 'MongoDB Atlas', 'Mongoose', 'Node.js', 'System Design'],
        ],
        [
            'title' => 'PostgreSQL Database Administrator',
            'description' => 'Administer PostgreSQL at scale: tuning, partitioning, upgrades with minimal downtime, and reviewing the queries teams want to ship.',
            'skills' => ['PostgreSQL', 'SQL', 'PL/SQL', 'Linux', 'Attention to Detail'],
        ],
        [
            'title' => 'Graph Database Engineer',
            'description' => 'Model a fraud-detection domain as a graph in Neo4j and build the traversals that make suspicious patterns visible.',
            'skills' => ['Neo4j', 'Neo4j Graph', 'Data Engineering', 'Fintech', 'Problem Solving'],
        ],
        [
            'title' => 'Cassandra Distributed Database Engineer',
            'description' => 'Operate multi-region Cassandra clusters for a write-heavy telemetry workload. Consistency trade-offs are explicit decisions in this role.',
            'skills' => ['Cassandra', 'Distributed Systems', 'Java', 'Linux', 'System Design'],
        ],

        // ---------- Security ----------
        [
            'title' => 'Application Security Engineer',
            'description' => 'Embed with product teams to find and fix classes of vulnerability, not just individual bugs. Threat modelling and secure defaults are the leverage here.',
            'skills' => ['Cybersecurity', 'Penetration Testing', 'Information Security', 'Cryptography', 'System Design'],
        ],
        [
            'title' => 'Penetration Tester',
            'description' => 'Run authorised assessments against our web estate and internal networks, then write reports developers can actually act on.',
            'skills' => ['Penetration Testing', 'Wireshark', 'Linux', 'Cybersecurity', 'Written Communication'],
        ],
        [
            'title' => 'Cloud Security Engineer',
            'description' => 'Secure our AWS footprint: identity boundaries, guardrails as code, and detection for the misconfigurations that matter.',
            'skills' => ['AWS', 'Cybersecurity', 'Terraform', 'Information Security', 'Kubernetes'],
        ],
        [
            'title' => 'Cryptography Engineer',
            'description' => 'Implement and review cryptographic components for a key management product. You will be expected to argue from primitives, not libraries alone.',
            'skills' => ['Cryptography', 'C++', 'Information Security', 'Rust', 'Attention to Detail'],
        ],
        [
            'title' => 'GDPR Compliance Analyst',
            'description' => 'Map our data flows, run privacy impact assessments, and work with engineering on retention and deletion that actually happens.',
            'skills' => ['GDPR', 'Information Security', 'Risk Management', 'Written Communication', 'Stakeholder Management'],
        ],
        [
            'title' => 'PCI DSS Compliance Specialist',
            'description' => 'Own our card-data compliance programme end to end, from scoping and segmentation through to the annual assessment.',
            'skills' => ['PCI DSS', 'Information Security', 'Risk Management', 'Fintech', 'Organization'],
        ],
        [
            'title' => 'Security Operations Analyst',
            'description' => 'Triage alerts, investigate suspicious activity and improve detection rules so the same noise does not reach you twice.',
            'skills' => ['Cybersecurity', 'Wireshark', 'Information Security', 'Analytical Skills', 'Linux'],
        ],

        // ---------- QA ----------
        [
            'title' => 'QA Automation Engineer',
            'description' => 'Build and maintain the automated regression suite that gates every release. Flaky tests are treated as defects here, not background noise.',
            'skills' => ['Python', 'Test-Driven Development', 'CI/CD', 'Jenkins', 'Attention to Detail'],
        ],
        [
            'title' => 'Manual QA Tester',
            'description' => 'Exploratory testing on new features before release, with clear, reproducible defect reports. You will be the last careful reader before customers see it.',
            'skills' => ['Attention to Detail', 'Jira', 'Agile Methodologies', 'Written Communication'],
        ],
        [
            'title' => 'Software Development Engineer in Test',
            'description' => 'Write the test infrastructure other engineers build on: fixtures, harnesses and the contract tests between services.',
            'skills' => ['Java', 'Test-Driven Development', 'BDD', 'CI/CD', 'Behavior-Driven Development'],
        ],
        [
            'title' => 'API Test Engineer',
            'description' => 'Validate our public API against its OpenAPI contract, including the failure modes and rate-limit behaviour clients depend on.',
            'skills' => ['Postman', 'REST', 'OpenAPI', 'Insomnia', 'Attention to Detail'],
        ],
        [
            'title' => 'Mobile QA Engineer',
            'description' => 'Test across a matrix of real devices and OS versions, with particular attention to upgrade paths and offline behaviour.',
            'skills' => ['Mobile Development', 'Android Development', 'iOS Development', 'Attention to Detail', 'Jira'],
        ],
        [
            'title' => 'Performance Engineer',
            'description' => 'Design load tests that resemble real traffic, then work with service owners to fix what they expose.',
            'skills' => ['Observability', 'Grafana', 'Python', 'Analytical Skills', 'System Design'],
        ],

        // ---------- Design & Product ----------
        [
            'title' => 'Senior UX Designer',
            'description' => 'Lead discovery and design for a complex internal tool. You will spend real time with users whose work is genuinely hard to observe from a desk.',
            'skills' => ['UX Design', 'User Research', 'Figma', 'Wireframing', 'Prototyping', 'Empathy'],
        ],
        [
            'title' => 'UI Designer',
            'description' => 'Craft the visual layer of our product: type, spacing, colour and states, delivered as components engineers can build from directly.',
            'skills' => ['UI Design', 'Figma', 'Sketch', 'Adobe XD', 'Attention to Detail'],
        ],
        [
            'title' => 'Product Designer',
            'description' => 'Own problems end to end, from framing through prototype to shipped interface. You will work alongside a product manager and two engineers.',
            'skills' => ['UX Design', 'UI Design', 'Prototyping', 'User Research', 'Collaboration'],
        ],
        [
            'title' => 'UX Researcher',
            'description' => 'Plan and run mixed-methods research, then turn it into findings teams act on. You will also own our experimentation practice.',
            'skills' => ['User Research', 'A/B Testing', 'Data Analysis', 'Empathy', 'Presentation Skills'],
        ],
        [
            'title' => 'Information Architect',
            'description' => 'Restructure a product whose navigation has grown by accretion for six years. Card sorting, tree testing and a great deal of patience.',
            'skills' => ['Information Architecture', 'UX Design', 'Wireframing', 'User Research'],
        ],
        [
            'title' => 'Graphic Designer',
            'description' => 'Produce brand and campaign assets across digital and print. You will work from an established identity and know when to stretch it.',
            'skills' => ['Photoshop', 'Illustrator', 'InDesign', 'Creativity', 'Brand Management'],
        ],
        [
            'title' => 'Product Manager',
            'description' => 'Own a product area outright: strategy, roadmap and the difficult prioritisation calls. You will say no more often than yes.',
            'skills' => ['Product Management', 'Stakeholder Management', 'Agile Methodologies', 'Strategic Planning', 'Prioritization'],
        ],
        [
            'title' => 'Technical Product Owner',
            'description' => 'Sit between platform engineering and the teams that consume it, translating technical constraints into a backlog that makes sense.',
            'skills' => ['Product Management', 'Scrum', 'Jira', 'Stakeholder Management', 'System Design'],
        ],
        [
            'title' => 'Agile Delivery Manager',
            'description' => 'Help three teams deliver predictably: unblock dependencies, keep ceremonies useful, and surface risk before it becomes a surprise.',
            'skills' => ['Agile', 'Scrum', 'Kanban', 'Project Management', 'Conflict Resolution', 'Jira'],
        ],

        // ---------- Marketing & commercial ----------
        [
            'title' => 'SEO Specialist',
            'description' => 'Own organic growth for a large content estate: technical audits, internal linking, and content briefs that target real intent.',
            'skills' => ['SEO', 'SEM', 'Content Marketing', 'Data Analysis', 'Digital Marketing'],
        ],
        [
            'title' => 'Digital Marketing Manager',
            'description' => 'Run paid and owned channels against a monthly acquisition target, and report honestly on what is and is not working.',
            'skills' => ['Digital Marketing', 'SEM', 'Social Media Marketing', 'Email Marketing', 'Budgeting'],
        ],
        [
            'title' => 'Content Marketing Strategist',
            'description' => 'Plan and commission content that ranks and converts. You will edit heavily and hold a consistent standard across freelancers.',
            'skills' => ['Content Marketing', 'SEO', 'Written Communication', 'Brand Management'],
        ],
        [
            'title' => 'Social Media Manager',
            'description' => 'Own our presence across three platforms, including community management and the judgement calls that come with it.',
            'skills' => ['Social Media Marketing', 'Content Marketing', 'Creativity', 'Communication'],
        ],
        [
            'title' => 'Growth Analyst',
            'description' => 'Design and read experiments across the funnel. You will need enough statistics to know when a result is not real.',
            'skills' => ['A/B Testing', 'Data Analysis', 'SQL', 'Statistics', 'Analytical Skills'],
        ],
        [
            'title' => 'E-commerce Manager',
            'description' => 'Own trading performance for our online store: merchandising, promotions and the analytics that inform both.',
            'skills' => ['E-commerce', 'Digital Marketing', 'Data Analysis', 'Forecasting', 'Decision Making'],
        ],
        [
            'title' => 'Brand Manager',
            'description' => 'Steward the brand across every touchpoint, and make the case for consistency when short-term pressure argues against it.',
            'skills' => ['Brand Management', 'Strategic Planning', 'Presentation Skills', 'Creativity'],
        ],
        [
            'title' => 'Email Marketing Specialist',
            'description' => 'Own lifecycle email: segmentation, automation and a steady programme of testing against revenue per send.',
            'skills' => ['Email Marketing', 'Content Marketing', 'A/B Testing', 'Data Analysis'],
        ],
        [
            'title' => 'Customer Success Manager',
            'description' => 'Own a portfolio of enterprise accounts through onboarding, adoption and renewal. Technical enough to be useful in a solution conversation.',
            'skills' => ['Customer Focus', 'Customer Service', 'Negotiation', 'Stakeholder Management', 'Empathy'],
        ],
        [
            'title' => 'Technical Support Engineer',
            'description' => 'Handle escalated customer issues across our API and integrations. You will read logs, reproduce problems and file well-researched bugs.',
            'skills' => ['Customer Service', 'SQL', 'REST', 'Linux', 'Problem Solving', 'Written Communication'],
        ],

        // ---------- Specialised engineering ----------
        [
            'title' => 'Blockchain Developer (Solidity)',
            'description' => 'Write and review Solidity contracts where mistakes are expensive and permanent. Gas efficiency and audit readiness are both in scope.',
            'skills' => ['Solidity', 'Smart Contracts', 'Blockchain', 'Web3', 'Cryptography'],
        ],
        [
            'title' => 'Embedded Systems Engineer',
            'description' => 'Develop firmware for battery-powered sensor hardware. Constrained memory, no dynamic allocation, and debugging that sometimes needs an oscilloscope.',
            'skills' => ['C', 'C++', 'Embedded Systems', 'Linux', 'Problem Solving'],
        ],
        [
            'title' => 'IoT Solutions Engineer',
            'description' => 'Connect fleets of devices to our cloud platform: provisioning, telemetry ingestion and over-the-air update strategy.',
            'skills' => ['IoT', 'Internet of Things', 'Python', 'Embedded Systems', 'AWS'],
        ],
        [
            'title' => 'Game Developer (Unity)',
            'description' => 'Build gameplay systems in Unity for a mobile title. Performance on mid-range Android devices is the constraint that shapes most decisions.',
            'skills' => ['Unity', 'C#', 'Game Development', 'Mobile Development', 'Problem Solving'],
        ],
        [
            'title' => 'Healthcare Integration Engineer',
            'description' => 'Integrate our platform with hospital systems under strict privacy obligations. Interfaces are rarely modern and never well documented.',
            'skills' => ['Healthcare IT', 'HIPAA', 'REST', 'Java', 'Information Security'],
        ],
        [
            'title' => 'Fintech Payments Engineer',
            'description' => 'Build payment flows where reconciliation must be exact. Idempotency, auditability and clear failure semantics are the core of the work.',
            'skills' => ['Fintech', 'Java', 'PostgreSQL', 'Kafka', 'Distributed Systems', 'PCI DSS'],
        ],
        [
            'title' => 'Technical Writer (Developer Documentation)',
            'description' => 'Write the reference and guides for our public API. You will read source code, run the examples, and refuse to document what you have not verified.',
            'skills' => ['Written Communication', 'REST', 'OpenAPI', 'Git', 'Attention to Detail'],
        ],
        [
            'title' => 'Solutions Architect',
            'description' => 'Work with prospective enterprise customers to design integrations, and feed what you learn back into the product roadmap.',
            'skills' => ['System Design', 'Microservices', 'AWS', 'Presentation Skills', 'Stakeholder Management'],
        ],
        [
            'title' => 'Engineering Manager (Backend)',
            'description' => 'Lead a team of six backend engineers. This is a people-first role: growth, delivery and technical direction, roughly in that order.',
            'skills' => ['Team Leadership', 'Mentorship', 'Coaching', 'Backend Development', 'Stakeholder Management', 'Decision Making'],
        ],
    ];

    public function run(): void
    {
        $recruiterIds = $this->seedRecruiters();
        $recruiterCount = count($recruiterIds);

        foreach (array_values(self::JOBS) as $index => $job) {
            JobPost::updateOrCreate(
                ['title' => $job['title']],
                [
                    'recruiter_id' => $recruiterIds[$index % $recruiterCount],
                    'description' => $job['description'],
                    'required_skills_json' => ['skills' => $job['skills']],
                    'is_active' => true,
                ],
            );
        }

        $this->command?->info(sprintf(
            'Seeded %d job posts across %d recruiters.',
            count(self::JOBS),
            $recruiterCount,
        ));
    }

    /**
     * @return list<string> recruiter user ids
     */
    private function seedRecruiters(): array
    {
        $ids = [];
        foreach (self::RECRUITERS as $recruiter) {
            $user = User::firstOrCreate(
                ['email' => $recruiter['email']],
                [
                    'name' => $recruiter['name'],
                    'password_hash' => Hash::make('password123'),
                    'role' => 'recruiter',
                ],
            );
            $ids[] = $user->id;
        }

        return $ids;
    }
}
