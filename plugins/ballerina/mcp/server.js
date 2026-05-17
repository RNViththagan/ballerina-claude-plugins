#!/usr/bin/env node
"use strict";

const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { z } = require("zod");

const { searchLibrariesTool, getLibraryTool } = require("./src/tools.js");

async function main() {
    const server = new McpServer({
        name: "ballerina-library",
        version: "0.1.0",
    });

    server.registerTool(
        "search_libraries",
        {
            title: "Search Ballerina Central libraries",
            description:
                "Search Ballerina Central for packages matching a keyword. Returns a tab-separated table of name, version, and description. Use this first to discover the correct org/name for a library, then call get_library.",
            inputSchema: {
                query: z.string().describe("Search keyword(s), e.g. 'gmail', 'stripe payment', 'mysql database'"),
            },
        },
        async ({ query }) => searchLibrariesTool({ query })
    );

    server.registerTool(
        "get_library",
        {
            title: "Get full Ballerina library API",
            description:
                "Fetch a Ballerina library's full API as a compact syntax string. Returns all clients, functions, type definitions, services, and annotations. The caller must filter to what their task needs.",
            inputSchema: {
                name: z
                    .string()
                    .describe("Package name as 'org/name' WITHOUT version suffix, e.g. 'ballerinax/github'"),
                version: z
                    .string()
                    .optional()
                    .describe("Optional explicit version. If omitted, Dependencies.toml in projectDir is consulted, otherwise the latest version from Central is used."),
                projectDir: z
                    .string()
                    .optional()
                    .describe("Optional path to a Ballerina project. Used to read Dependencies.toml for locked versions."),
            },
        },
        async ({ name, version, projectDir }) =>
            getLibraryTool({ name, version, projectDir })
    );

    const transport = new StdioServerTransport();
    await server.connect(transport);
}

main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error("[ballerina-library MCP] fatal:", err);
    process.exit(1);
});
