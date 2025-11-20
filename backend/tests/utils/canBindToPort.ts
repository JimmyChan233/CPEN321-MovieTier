/**
 * Utility to check if the environment allows binding to ports
 * Used to skip tests that require network binding in restricted environments (sandbox, CI)
 */

import * as net from "net";

let cachedResult: boolean | null = null;

/**
 * Check if we can bind to a port (async version)
 */
export async function canBindToPort(): Promise<boolean> {
  if (cachedResult !== null) {
    return cachedResult;
  }

  return new Promise((resolve) => {
    const server = net.createServer();

    server.once("error", () => {
      cachedResult = false;
      resolve(false);
    });

    server.once("listening", () => {
      server.close();
      cachedResult = true;
      resolve(true);
    });

    // Try to bind to port 0 (OS assigns a free port)
    server.listen(0, () => {
      server.close();
      cachedResult = true;
      resolve(true);
    });

    // Timeout after 1 second
    setTimeout(() => {
      if (!cachedResult) {
        server.close();
        cachedResult = false;
        resolve(false);
      }
    }, 1000);
  });
}

/**
 * Skip helper for test suites that require port binding
 * Usage:
 * ```
 * beforeAll(async () => {
 *   if (!await canBindToPort()) {
 *     console.log("Skipping tests that require port binding");
 *     return;
 *   }
 * });
 * ```
 */
export function skipIfCantBindToPort(callback: () => void): void {
  canBindToPort().then((canBind) => {
    if (!canBind) {
      console.warn(
        "Environment does not support port binding. Skipping this test suite.",
      );
      return; // Skip
    }
    callback();
  });
}
