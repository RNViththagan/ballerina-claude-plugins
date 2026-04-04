/**
 * JSON-RPC client for the Ballerina Language Server.
 * Spawns the LS via start-ls.sh and keeps it alive for the plugin session.
 * Uses vscode-jsonrpc for LSP framing (MIT).
 */

import { spawn } from "child_process";
import {
  createMessageConnection,
  StreamMessageReader,
  StreamMessageWriter,
  RequestType,
  NotificationType,
} from "vscode-jsonrpc/node.js";

const INITIALIZE_METHOD = new RequestType("initialize");
const INITIALIZED_METHOD = new NotificationType("initialized");

export class BallerinaLSClient {
  #connection = null;
  #initPromise = null;

  async ensureStarted() {
    if (this.#connection) return;
    if (this.#initPromise) return this.#initPromise;
    this.#initPromise = this.#start();
    return this.#initPromise;
  }

  async #start() {
    // Always use start-ls.sh with the local LS build — CopilotLibraryService
    // is not yet in any released Ballerina distribution.
    const scriptDir = new URL(".", import.meta.url).pathname;
    const command = `${scriptDir}start-ls.sh`;
    const args = [];

    const proc = spawn(command, args, {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env },
    });

    proc.on("error", (err) => {
      throw new Error(`Failed to start Ballerina LS: ${err.message}`);
    });

    // Forward LS stderr so we can see startup errors
    proc.stderr.on("data", (chunk) => process.stderr.write(`[LS] ${chunk}`));

    const connection = createMessageConnection(
      new StreamMessageReader(proc.stdout),
      new StreamMessageWriter(proc.stdin)
    );

    connection.listen();

    await connection.sendRequest(INITIALIZE_METHOD, {
      processId: process.pid,
      capabilities: {},
      rootUri: null,
    });

    connection.sendNotification(INITIALIZED_METHOD, {});

    this.#connection = connection;
  }

  async request(method, params) {
    await this.ensureStarted();
    const requestType = new RequestType(method);
    return this.#connection.sendRequest(requestType, params);
  }

  shutdown() {
    if (this.#connection) {
      this.#connection.dispose();
      this.#connection = null;
      this.#initPromise = null;
    }
  }
}
