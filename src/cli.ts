#!/usr/bin/env node
import { mkdir, writeFile, readFile, stat } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATE_ROOT = resolve(__dirname, "..");

const COLORS = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
};

function log(msg: string) {
  console.log(msg);
}
function success(msg: string) {
  console.log(`${COLORS.green}${COLORS.bold}✓${COLORS.reset} ${msg}`);
}
function info(msg: string) {
  console.log(`${COLORS.cyan}ℹ${COLORS.reset} ${msg}`);
}
function error(msg: string) {
  console.error(`${COLORS.red}✗${COLORS.reset} ${msg}`);
}

interface ProjectOptions {
  name: string;
  description: string;
  authMode: "none" | "api-key" | "oauth";
  transport: "both" | "stdio" | "http";
  includeExamples: boolean;
  installDeps: boolean;
}

const TEMPLATE_FILES = [
  "tsconfig.json",
  "vitest.config.ts",
  "eslint.config.js",
  ".prettierrc",
  ".gitignore",
  ".node-version",
  "Dockerfile",
  "docker-compose.yml",
  ".github/workflows/ci.yml",
  ".github/FUNDING.yml",
  "src/config.ts",
  "src/logger.ts",
  "src/server.ts",
  "src/utils/errors.ts",
  "src/utils/version.ts",
  "src/auth/types.ts",
  "src/auth/api-key-verifier.ts",
  "src/auth/jwt-verifier.ts",
  "src/auth/oauth-provider.ts",
  "src/transports/stdio.ts",
  "src/transports/http.ts",
  "src/tools/index.ts",
  "src/tools/echo.ts",
  "src/tools/calculator.ts",
  "src/tools/fetch-api.ts",
  "src/tools/file-ops.ts",
  "src/tools/database.ts",
  "src/resources/index.ts",
  "src/resources/config-resource.ts",
  "src/resources/items-resource.ts",
  "src/resources/user-resource.ts",
  "src/prompts/index.ts",
  "src/prompts/code-review.ts",
  "src/prompts/summarize.ts",
  "tests/server.test.ts",
  "tests/tools/echo.test.ts",
  "tests/tools/calculator.test.ts",
  "tests/tools/database.test.ts",
  "tests/auth/api-key-verifier.test.ts",
];

const MINIMAL_FILES = [
  "tsconfig.json",
  "vitest.config.ts",
  "eslint.config.js",
  ".prettierrc",
  ".gitignore",
  ".node-version",
  "Dockerfile",
  "docker-compose.yml",
  ".github/workflows/ci.yml",
  "src/config.ts",
  "src/logger.ts",
  "src/server.ts",
  "src/utils/errors.ts",
  "src/utils/version.ts",
  "src/auth/types.ts",
  "src/auth/api-key-verifier.ts",
  "src/auth/jwt-verifier.ts",
  "src/auth/oauth-provider.ts",
  "src/transports/stdio.ts",
  "src/transports/http.ts",
  "src/tools/index.ts",
  "src/tools/echo.ts",
  "src/resources/index.ts",
  "src/resources/config-resource.ts",
  "src/prompts/index.ts",
  "tests/server.test.ts",
  "tests/tools/echo.test.ts",
];

async function prompt(
  rl: ReturnType<typeof createInterface>,
  question: string,
  defaultValue?: string,
): Promise<string> {
  const suffix = defaultValue ? ` ${COLORS.dim}(${defaultValue})${COLORS.reset}` : "";
  const answer = await rl.question(`${COLORS.bold}?${COLORS.reset} ${question}${suffix}: `);
  return answer.trim() || defaultValue || "";
}

async function choose(
  rl: ReturnType<typeof createInterface>,
  question: string,
  options: { label: string; value: string }[],
  defaultIndex = 0,
): Promise<string> {
  log(`\n${COLORS.bold}?${COLORS.reset} ${question}`);
  for (let i = 0; i < options.length; i++) {
    const marker = i === defaultIndex ? `${COLORS.cyan}❯${COLORS.reset}` : " ";
    log(
      `  ${marker} ${options[i].label}${i === defaultIndex ? ` ${COLORS.dim}(default)${COLORS.reset}` : ""}`,
    );
  }
  const answer = await rl.question(`  Enter choice [${options.map((_, i) => i + 1).join("/")}]: `);
  const idx = parseInt(answer.trim()) - 1;
  return options[idx >= 0 && idx < options.length ? idx : defaultIndex].value;
}

async function confirm(
  rl: ReturnType<typeof createInterface>,
  question: string,
  defaultYes = true,
): Promise<boolean> {
  const hint = defaultYes ? "Y/n" : "y/N";
  const answer = await rl.question(
    `${COLORS.bold}?${COLORS.reset} ${question} ${COLORS.dim}(${hint})${COLORS.reset}: `,
  );
  if (!answer.trim()) return defaultYes;
  return answer.trim().toLowerCase().startsWith("y");
}

function generatePackageJson(opts: ProjectOptions): string {
  return JSON.stringify(
    {
      name: opts.name,
      version: "0.1.0",
      description: opts.description,
      type: "module",
      engines: { node: ">=24.0.0" },
      bin: { [opts.name]: "./dist/transports/stdio.js" },
      main: "./dist/server.js",
      scripts: {
        ...(opts.transport !== "http" ? { "dev:stdio": "tsx src/transports/stdio.ts" } : {}),
        ...(opts.transport !== "stdio" ? { "dev:http": "tsx src/transports/http.ts" } : {}),
        build: "tsc",
        ...(opts.transport !== "http" ? { "start:stdio": "node dist/transports/stdio.js" } : {}),
        ...(opts.transport !== "stdio" ? { "start:http": "node dist/transports/http.js" } : {}),
        test: "vitest run",
        "test:watch": "vitest",
        lint: "eslint src/",
        "lint:fix": "eslint src/ --fix",
        format: "prettier --write 'src/**/*.ts'",
        "format:check": "prettier --check 'src/**/*.ts'",
        typecheck: "tsc --noEmit",
        clean: "rm -rf dist",
        prepublishOnly: "npm run clean && npm run build",
      },
      keywords: ["mcp", "model-context-protocol", "ai", "llm", "server", "typescript"],
      license: "UNLICENSED",
      dependencies: {
        "@modelcontextprotocol/sdk": "^1.29.0",
        dotenv: "^16.4.0",
        ...(opts.transport !== "stdio" ? { express: "^5.1.0" } : {}),
        ...(opts.authMode !== "none" ? { jose: "^6.0.0" } : {}),
        pino: "^9.6.0",
        "smol-toml": "^1.6.1",
        zod: "^3.25.0",
      },
      devDependencies: {
        ...(opts.transport !== "stdio" ? { "@types/express": "^5.0.0" } : {}),
        "@types/node": "^24.0.0",
        eslint: "^9.0.0",
        "eslint-config-prettier": "^10.0.0",
        "pino-pretty": "^13.0.0",
        prettier: "^3.4.0",
        tsx: "^4.20.0",
        typescript: "^5.8.0",
        "typescript-eslint": "^8.0.0",
        vitest: "^3.0.0",
      },
    },
    null,
    2,
  );
}

function generateConfigToml(opts: ProjectOptions): string {
  const lines = [
    `# ${opts.name} — MCP Server Configuration`,
    "",
    "[server]",
    `name = "${opts.name}"`,
    'version = "0.1.0"',
    "",
  ];

  if (opts.transport !== "stdio") {
    lines.push("[http]", "port = 3000", 'host = "127.0.0.1"', "");
  }

  lines.push("[logging]", 'level = "info"', "");
  lines.push("[auth]", `mode = "${opts.authMode}"`);

  if (opts.authMode === "api-key") {
    lines.push('keys = ["change-me-in-production"]');
  }

  lines.push("");
  return lines.join("\n");
}

function generateReadme(opts: ProjectOptions): string {
  return `# ${opts.name}

${opts.description}

Built with [mcp-server-boilerplate](https://github.com/jeandbonicel/mcp-server-boilerplate).

## Quick Start

\`\`\`bash
npm install
npm run build
${opts.transport !== "http" ? "npm run start:stdio" : "npm run start:http"}
\`\`\`

## Development

\`\`\`bash
${opts.transport !== "http" ? "npm run dev:stdio" : "npm run dev:http"}
\`\`\`

## Configuration

Edit \`config.toml\` or use environment variables. See \`.env.example\` for all options.

## Testing

\`\`\`bash
npm test
\`\`\`

`;
}

async function copyTemplateFile(
  file: string,
  destDir: string,
  replacements: Map<string, string>,
): Promise<void> {
  const srcPath = join(TEMPLATE_ROOT, file);
  const destPath = join(destDir, file);

  await mkdir(dirname(destPath), { recursive: true });

  try {
    let content = await readFile(srcPath, "utf-8");
    for (const [search, replace] of replacements) {
      content = content.replaceAll(search, replace);
    }
    await writeFile(destPath, content, "utf-8");
  } catch {
    // If source file doesn't exist (e.g. running from dist/), copy from the package root
    const altSrc = join(TEMPLATE_ROOT, "..", file);
    try {
      let content = await readFile(altSrc, "utf-8");
      for (const [search, replace] of replacements) {
        content = content.replaceAll(search, replace);
      }
      await writeFile(destPath, content, "utf-8");
    } catch {
      // Skip files that don't exist in the template
    }
  }
}

async function scaffold(opts: ProjectOptions): Promise<void> {
  const destDir = resolve(process.cwd(), opts.name);

  // Check if directory exists
  try {
    await stat(destDir);
    error(`Directory "${opts.name}" already exists`);
    process.exit(1);
  } catch {
    // Directory doesn't exist — good
  }

  log("");
  info(`Creating project in ${COLORS.bold}${destDir}${COLORS.reset}`);

  await mkdir(destDir, { recursive: true });

  const replacements = new Map<string, string>([
    ["mcp-server-boilerplate", opts.name],
    ["mcp-server", opts.name],
  ]);

  // Select files based on options
  const files = opts.includeExamples ? TEMPLATE_FILES : MINIMAL_FILES;

  // Copy template files
  for (const file of files) {
    await copyTemplateFile(file, destDir, replacements);
    log(`  ${COLORS.dim}create${COLORS.reset} ${file}`);
  }

  // Generate custom files
  await writeFile(join(destDir, "package.json"), generatePackageJson(opts));
  log(`  ${COLORS.dim}create${COLORS.reset} package.json`);

  await writeFile(join(destDir, "config.toml"), generateConfigToml(opts));
  log(`  ${COLORS.dim}create${COLORS.reset} config.toml`);

  await writeFile(join(destDir, "README.md"), generateReadme(opts));
  log(`  ${COLORS.dim}create${COLORS.reset} README.md`);

  await writeFile(join(destDir, ".env.example"), generateEnvExample(opts));
  log(`  ${COLORS.dim}create${COLORS.reset} .env.example`);

  // Update server.ts if minimal (no examples)
  if (!opts.includeExamples) {
    const serverPath = join(destDir, "src/server.ts");
    try {
      let server = await readFile(serverPath, "utf-8");
      // Remove imports for tools/resources/prompts that don't exist
      server = server
        .replace(
          'import { registerAll as registerTools } from "./tools/index.js";',
          'import { registerAll as registerTools } from "./tools/index.js";',
        )
        .replace(
          'import { registerAll as registerResources } from "./resources/index.js";',
          'import { registerAll as registerResources } from "./resources/index.js";',
        )
        .replace(
          'import { registerAll as registerPrompts } from "./prompts/index.js";',
          'import { registerAll as registerPrompts } from "./prompts/index.js";',
        );
      await writeFile(serverPath, server);
    } catch {
      // Ignore
    }

    // Write minimal tools/index.ts
    await mkdir(join(destDir, "src/tools"), { recursive: true });
    await writeFile(
      join(destDir, "src/tools/index.ts"),
      `import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as echo from "./echo.js";

export function registerAll(server: McpServer): void {
  echo.register(server);
}
`,
    );

    // Write minimal resources/index.ts
    await mkdir(join(destDir, "src/resources"), { recursive: true });
    await writeFile(
      join(destDir, "src/resources/index.ts"),
      `import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as configResource from "./config-resource.js";

export function registerAll(server: McpServer): void {
  configResource.register(server);
}
`,
    );

    // Write minimal prompts/index.ts
    await mkdir(join(destDir, "src/prompts"), { recursive: true });
    await writeFile(
      join(destDir, "src/prompts/index.ts"),
      `import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerAll(_server: McpServer): void {
  // Register your prompts here
}
`,
    );
  }

  // Initialize git
  try {
    execSync("git init", { cwd: destDir, stdio: "ignore" });
    execSync("git add -A", { cwd: destDir, stdio: "ignore" });
    execSync('git commit -m "Initial commit from create-mcp-server"', {
      cwd: destDir,
      stdio: "ignore",
    });
    success("Initialized git repository");
  } catch {
    info("Skipped git init (git not available)");
  }

  // Install dependencies
  if (opts.installDeps) {
    info("Installing dependencies...");
    try {
      execSync("npm install", { cwd: destDir, stdio: "inherit" });
      success("Dependencies installed");
    } catch {
      error("Failed to install dependencies — run `npm install` manually");
    }
  }

  // Done!
  log("");
  log(`${COLORS.green}${COLORS.bold}🚀 Project created successfully!${COLORS.reset}`);
  log("");
  log("  Next steps:");
  log(`  ${COLORS.cyan}cd ${opts.name}${COLORS.reset}`);
  if (!opts.installDeps) {
    log(`  ${COLORS.cyan}npm install${COLORS.reset}`);
  }
  log(`  ${COLORS.cyan}npm run dev:${opts.transport === "http" ? "http" : "stdio"}${COLORS.reset}`);
  log("");
  log(`  Edit ${COLORS.bold}config.toml${COLORS.reset} for configuration`);
  log(`  Add tools in ${COLORS.bold}src/tools/${COLORS.reset}`);
  log(`  Add resources in ${COLORS.bold}src/resources/${COLORS.reset}`);
  log("");
}

function generateEnvExample(opts: ProjectOptions): string {
  const lines = [
    "# Environment variables override config.toml values",
    "# MCP_CONFIG_PATH=./config.toml",
    `# MCP_SERVER_NAME=${opts.name}`,
    "# LOG_LEVEL=info",
  ];
  if (opts.transport !== "stdio") {
    lines.push("# MCP_HTTP_PORT=3000", "# MCP_HTTP_HOST=127.0.0.1");
  }
  if (opts.authMode !== "none") {
    lines.push(`# MCP_AUTH_MODE=${opts.authMode}`);
    if (opts.authMode === "api-key") {
      lines.push("# MCP_API_KEYS=key1,key2");
    }
  }
  lines.push("");
  return lines.join("\n");
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === "init" || command === "create" || !command) {
    const projectName = args[1];

    log("");
    log(`${COLORS.bold}${COLORS.cyan}  create-mcp-server${COLORS.reset}`);
    log(`${COLORS.dim}  Scaffold a new MCP server project${COLORS.reset}`);
    log("");

    const rl = createInterface({ input: process.stdin, output: process.stdout });

    try {
      const name = projectName || (await prompt(rl, "Project name", "my-mcp-server"));
      const description = await prompt(rl, "Description", "An MCP server");

      const transport = (await choose(rl, "Transport mode?", [
        { label: "Both stdio + HTTP", value: "both" },
        { label: "stdio only (local)", value: "stdio" },
        { label: "HTTP only (remote)", value: "http" },
      ])) as ProjectOptions["transport"];

      const authMode = (await choose(rl, "Authentication?", [
        { label: "None", value: "none" },
        { label: "API Key", value: "api-key" },
        { label: "OAuth 2.1", value: "oauth" },
      ])) as ProjectOptions["authMode"];

      const includeExamples = await confirm(rl, "Include example tools/resources/prompts?", true);
      const installDeps = await confirm(rl, "Install dependencies now?", true);

      rl.close();

      await scaffold({ name, description, authMode, transport, includeExamples, installDeps });
    } catch (err) {
      rl.close();
      if ((err as NodeJS.ErrnoException).code === "ERR_USE_AFTER_CLOSE") {
        // User pressed Ctrl+C
        log("\nAborted.");
      } else {
        throw err;
      }
    }
  } else if (command === "--help" || command === "-h") {
    log(`
${COLORS.bold}create-mcp-server${COLORS.reset} — Scaffold a new MCP server project

${COLORS.bold}Usage:${COLORS.reset}
  npx mcp-server-boilerplate init [project-name]
  npx mcp-server-boilerplate create [project-name]
  npx mcp-server-boilerplate --help

${COLORS.bold}Examples:${COLORS.reset}
  npx mcp-server-boilerplate init my-server
  npx mcp-server-boilerplate create
`);
  } else {
    error(`Unknown command: ${command}`);
    log("Run with --help for usage info");
    process.exit(1);
  }
}

main().catch((err) => {
  error(`${(err as Error).message}`);
  process.exit(1);
});
