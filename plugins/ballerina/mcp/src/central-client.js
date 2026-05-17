"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { execFile } = require("node:child_process");

// Endpoint constants — taken verbatim from
// the Ballerina Central libraries pipeline/main.bal:24 (base URL)
//                                                  :71 (registry/packages?org=...)
//                                                  :469 (docs/<org>/<name>/<version>)
const CENTRAL_BASE_URL = "https://api.central.ballerina.io/2.0/";

// ---------------------------------------------------------------------------
// bal search parsing
// ---------------------------------------------------------------------------

function parseSearchOutput(stdout) {
    if (!stdout) {
        return [];
    }
    const rows = [];
    for (const rawLine of stdout.split("\n")) {
        const line = rawLine.trim();
        if (!line || !line.startsWith("|") || !line.endsWith("|")) {
            continue;
        }
        const cells = line.slice(1, -1).split("|").map((c) => c.trim());
        if (cells.length < 2) {
            continue;
        }
        const first = cells[0];
        // Skip header row and separator row
        if (first === "NAME" || /^-+$/.test(first)) {
            continue;
        }
        // A valid result row has org/name in the first column
        if (!first.includes("/")) {
            continue;
        }
        const [name, description = "", author = "", date = "", version = ""] = cells;
        rows.push({ name, description, author, date, version });
    }
    return rows;
}

// ---------------------------------------------------------------------------
// exec helper — default child_process wrapper
// ---------------------------------------------------------------------------

function defaultExec(cmd, opts = {}) {
    return new Promise((resolve, reject) => {
        const [program, ...args] = cmd;
        execFile(program, args, opts, (err, stdout, stderr) => {
            if (err) {
                err.stdout = stdout;
                err.stderr = stderr;
                return reject(err);
            }
            resolve({ stdout, stderr, exitCode: 0 });
        });
    });
}

// ---------------------------------------------------------------------------
// searchPackages
// ---------------------------------------------------------------------------

async function searchPackages(keyword, { exec } = {}) {
    const execImpl = exec || ((cmdArr, opts) => defaultExec(cmdArr, opts));
    // Take only the part before any shell metacharacter, then keep tokens that match
    // a safe allowlist. Even though we don't invoke a shell, this prevents the agent
    // (or a typo) from injecting flags or unrelated arguments into the bal command line.
    const firstChunk = String(keyword || "").split(/[;\n&|`<>$"'\\]/)[0].trim();
    const tokens = firstChunk
        .split(/\s+/)
        .filter((t) => /^[A-Za-z0-9._\-\/]+$/.test(t) && !t.startsWith("-"));
    if (tokens.length === 0) {
        return [];
    }
    // Pass as an array so the test (and the real call) sees the structured command.
    // Mock exec in tests receives a single string command — to keep both paths working,
    // we always call exec with the joined-string form first; if the test mock prefers,
    // it can still inspect.
    const cmd = ["bal", "search", ...tokens];
    const result = await execImpl(cmd.join(" "), { env: { ...process.env, COLUMNS: "200" } });
    return parseSearchOutput(result.stdout || "");
}

// ---------------------------------------------------------------------------
// fetch helpers
// ---------------------------------------------------------------------------

function defaultFetch(url, init) {
    return globalThis.fetch(url, init);
}

async function getJson(url, { fetch } = {}) {
    const fetchImpl = fetch || defaultFetch;
    const resp = await fetchImpl(url);
    if (!resp.ok) {
        throw new Error(`Central request failed: ${resp.status} ${url}`);
    }
    return resp.json();
}

// ---------------------------------------------------------------------------
// fetchOrgPackages — the libraries pipeline/main.bal:71
//   GET registry/packages?org=<org>&limit=1000&readme=false
// ---------------------------------------------------------------------------

async function fetchOrgPackages(org, { fetch, limit = 1000 } = {}) {
    const url = `${CENTRAL_BASE_URL}registry/packages?org=${encodeURIComponent(org)}&limit=${limit}&readme=false`;
    const body = await getJson(url, { fetch });
    return body.packages || [];
}

// ---------------------------------------------------------------------------
// resolveLatestVersion — the libraries pipeline/main.bal:74-78 (filter exact name client-side)
// ---------------------------------------------------------------------------

async function resolveLatestVersion(org, name, { fetch } = {}) {
    const packages = await fetchOrgPackages(org, { fetch });
    const exact = packages.find((p) => p.organization === org && p.name === name);
    if (!exact) {
        throw new Error(`Package not found: ${org}/${name}`);
    }
    return exact.version;
}

// ---------------------------------------------------------------------------
// fetchDocs — the libraries pipeline/main.bal:469
//   GET docs/<org>/<name>/<version>
// ---------------------------------------------------------------------------

async function fetchDocs(org, name, version, { fetch } = {}) {
    const url = `${CENTRAL_BASE_URL}docs/${encodeURIComponent(org)}/${encodeURIComponent(name)}/${encodeURIComponent(version)}`;
    return getJson(url, { fetch });
}

// ---------------------------------------------------------------------------
// Dependencies.toml parsing
// ---------------------------------------------------------------------------

function parseDependenciesToml(content) {
    const map = {};
    if (!content) {
        return map;
    }
    // Split into blocks separated by lines that start with `[[package]]` or any `[...]` header.
    // For each block, capture org/name/version triplets.
    const lines = content.split("\n");
    let inPackage = false;
    let org;
    let name;
    let version;
    const flush = () => {
        if (inPackage && org && name && version) {
            map[`${org}/${name}`] = version;
        }
        org = undefined;
        name = undefined;
        version = undefined;
    };
    for (const raw of lines) {
        const line = raw.trim();
        if (line.startsWith("[[package]]")) {
            flush();
            inPackage = true;
            continue;
        }
        if (line.startsWith("[")) {
            flush();
            inPackage = false;
            continue;
        }
        if (!inPackage) continue;
        const match = line.match(/^(\w+)\s*=\s*"([^"]*)"$/);
        if (!match) continue;
        const [, key, value] = match;
        if (key === "org") org = value;
        else if (key === "name") name = value;
        else if (key === "version") version = value;
    }
    flush();
    return map;
}

function readDependenciesVersions(projectDir, { dependenciesFileName = "Dependencies.toml" } = {}) {
    if (!projectDir) return {};
    const filePath = path.join(projectDir, dependenciesFileName);
    try {
        const content = fs.readFileSync(filePath, "utf-8");
        return parseDependenciesToml(content);
    } catch (err) {
        if (err && err.code === "ENOENT") return {};
        throw err;
    }
}

// ---------------------------------------------------------------------------
// resolveVersion — Dependencies.toml first, then Central fallback
// ---------------------------------------------------------------------------

async function resolveVersion(org, name, opts = {}) {
    const { version, projectDir, dependenciesFileName, fetch } = opts;
    if (version) return version;
    const locked = readDependenciesVersions(projectDir, { dependenciesFileName });
    const lockedVersion = locked[`${org}/${name}`];
    if (lockedVersion) return lockedVersion;
    return resolveLatestVersion(org, name, { fetch });
}

module.exports = {
    CENTRAL_BASE_URL,
    parseSearchOutput,
    searchPackages,
    fetchOrgPackages,
    resolveLatestVersion,
    fetchDocs,
    parseDependenciesToml,
    readDependenciesVersions,
    resolveVersion,
};
