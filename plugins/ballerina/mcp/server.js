/**
 * Ballerina MCP server — exposes library discovery tools to Claude.
 * Uses `bal library search/get` CLI commands (bal-library-tool) to query
 * the bundled SQLite indexes — no Language Server dependency.
 *
 * Tools:
 *   search_libraries  — find libraries by keywords
 *   get_library       — get full API details for libraries
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { spawnSync } from "child_process";
import { z } from "zod";

const server = new McpServer({
  name: "ballerina",
  version: "1.0.0",
});

server.tool(
  "search_libraries",
  "Search for Ballerina libraries by keywords. Returns up to 9 matching packages with name and description. Use this first to discover which libraries are relevant before calling get_library.",
  {
    keywords: z
      .array(z.string())
      .min(1)
      .max(10)
      .describe(
        "Search keywords ordered by importance. Examples: ['email', 'smtp'], ['http', 'client'], ['salesforce', 'crm']"
      ),
  },
  async ({ keywords }) => {
    const result = spawnSync("bal", ["library", "search", ...keywords], { encoding: "utf8" });

    if (result.error || result.status !== 0) {
      const msg = result.error?.message ?? result.stderr ?? "bal library search failed";
      process.stderr.write(`[search_libraries error] ${msg}\n`);
      throw new Error(msg);
    }

    const libraries = JSON.parse(result.stdout);
    if (libraries.length === 0) {
      return { content: [{ type: "text", text: "No libraries found for the given keywords." }] };
    }

    return {
      content: [{ type: "text", text: libraries.map(l => `${l.name}: ${l.description}`).join("\n") }],
    };
  }
);

server.tool(
  "get_library",
  "Get full API details for one or more Ballerina libraries — clients, functions, and type definitions. Call this after search_libraries to get the actual function signatures needed for code generation.",
  {
    libNames: z
      .array(z.string())
      .min(1)
      .describe(
        "Library names in 'org/package' format. Examples: ['ballerina/http'], ['ballerina/http', 'ballerinax/salesforce']"
      ),
  },
  async ({ libNames }) => {
    const result = spawnSync("bal", ["library", "get", ...libNames], { encoding: "utf8", maxBuffer: 50 * 1024 * 1024 });

    if (result.error || result.status !== 0) {
      const msg = result.error?.message ?? result.stderr ?? "bal library get failed";
      process.stderr.write(`[get_library error] ${msg}\n`);
      throw new Error(msg);
    }

    return { content: [{ type: "text", text: result.stdout }] };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
