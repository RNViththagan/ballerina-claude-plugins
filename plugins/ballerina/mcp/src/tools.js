"use strict";

const centralClient = require("./central-client.js");
const { centralDocsToLibrary } = require("./central-to-library.js");
const { toSyntaxString } = require("./to-syntax-string.js");

function asTextResult(text) {
    return { content: [{ type: "text", text }] };
}

function formatSearchRows(rows) {
    if (rows.length === 0) {
        return "No packages found.";
    }
    const lines = ["NAME\tVERSION\tDESCRIPTION"];
    for (const row of rows) {
        lines.push(`${row.name}\t${row.version}\t${row.description}`);
    }
    return lines.join("\n");
}

function parseQualifiedName(name) {
    const m = /^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/.exec((name || "").trim());
    if (!m) {
        throw new Error(`Invalid package name '${name}'. Expected 'org/name' (no version suffix).`);
    }
    return { org: m[1], name: m[2] };
}

async function searchLibrariesTool(args, deps = {}) {
    const query = args && args.query;
    if (!query) {
        throw new Error("'query' is required");
    }
    const rows = await centralClient.searchPackages(query, { exec: deps.exec });
    return asTextResult(formatSearchRows(rows));
}

async function getLibraryTool(args, deps = {}) {
    const rawName = args && args.name;
    if (!rawName) {
        throw new Error("'name' is required");
    }
    const { org, name } = parseQualifiedName(rawName);
    const version = await centralClient.resolveVersion(org, name, {
        version: args.version,
        projectDir: args.projectDir,
        fetch: deps.fetch,
    });
    const docs = await centralClient.fetchDocs(org, name, version, { fetch: deps.fetch });
    const library = centralDocsToLibrary(docs);
    const syntax = toSyntaxString([library]);
    const header = `// Resolved: ${org}/${name}:${version}\n`;
    return asTextResult(header + syntax);
}

module.exports = {
    searchLibrariesTool,
    getLibraryTool,
    parseQualifiedName,
    formatSearchRows,
};
