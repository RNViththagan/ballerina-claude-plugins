/**
 * Ballerina MCP server — exposes library discovery tools to Claude.
 * Tools proxy to the Ballerina Language Server via a dedicated LS child process.
 *
 * Tools:
 *   search_libraries  — find libraries by keywords (copilotLibraryManager/getLibrariesBySearch)
 *   get_library       — get full API details for libraries (copilotLibraryManager/getFilteredLibraries)
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { BallerinaLSClient } from "./ls-client.js";

// Resolve LOCAL_BAL_LS_JAR/BUILD from the known local build path if not set in env.
if (!process.env.LOCAL_BAL_LS_JAR) {
  const { readdirSync } = await import("fs");
  const LS_BUILD = "/Users/viththagan/WSO2/ballerina-language-server";
  const jarDir = `${LS_BUILD}/flow-model-generator/modules/flow-model-generator-ls-extension/build/libs`;
  try {
    const jars = readdirSync(jarDir).filter(f =>
      f.startsWith("flow-model-generator-ls-extension") && f.endsWith(".jar") &&
      !f.includes("sources") && !f.includes("all.")
    );
    if (jars.length > 0) {
      process.env.LOCAL_BAL_LS_JAR = `${jarDir}/${jars.sort().at(-1)}`;
      process.env.LOCAL_BAL_LS_BUILD = LS_BUILD;
      process.stderr.write(`[MCP] Using local LS jar: ${process.env.LOCAL_BAL_LS_JAR}\n`);
    }
  } catch { /* local build not available */ }
}

const ls = new BallerinaLSClient();

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
    try {
      const result = await ls.request(
        "copilotLibraryManager/getLibrariesBySearch",
        { keywords }
      );

      const libraries = result?.libraries ?? [];
      if (libraries.length === 0) {
        return { content: [{ type: "text", text: "No libraries found for the given keywords." }] };
      }

      return {
        content: [{ type: "text", text: libraries.map(lib => `${lib.name}: ${lib.description}`).join("\n") }],
      };
    } catch (err) {
      process.stderr.write(`[search_libraries error] ${err?.message ?? err}\n`);
      throw err;
    }
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
    try {
      const result = await ls.request(
        "copilotLibraryManager/getFilteredLibraries",
        { libNames }
      );

      const libraries = result?.libraries ?? [];
      if (libraries.length === 0) {
        return { content: [{ type: "text", text: "No library details found." }] };
      }

      return { content: [{ type: "text", text: JSON.stringify(libraries, null, 2) }] };
    } catch (err) {
      process.stderr.write(`[get_library error] ${err?.message ?? err}\n`);
      throw err;
    }
  }
);

process.on("SIGINT", () => { ls.shutdown(); process.exit(0); });
process.on("SIGTERM", () => { ls.shutdown(); process.exit(0); });

const transport = new StdioServerTransport();
await server.connect(transport);
