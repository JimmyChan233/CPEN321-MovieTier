/**
 * @unmocked Integration tests for SSE service
 * Tests with real MongoDB database
 */

/**
 * SSE Service Tests - Unmocked
 * Tests for Server-Sent Events service with mock Response objects
 */

import { Response } from "express";
import { EventEmitter } from "events";
import { sseService } from "../../../src/services/sse/sseService";

// Mock Response class that extends EventEmitter
class MockResponse extends EventEmitter {
  public writableEnded: boolean = false;
  public destroyed: boolean = false;
  public writtenData: string[] = [];
  public shouldThrowOnWrite: boolean = false;

  write(data: string): boolean {
    if (this.shouldThrowOnWrite) {
      throw new Error("Write error");
    }
    if (this.writableEnded || this.destroyed) {
      return false;
    }
    this.writtenData.push(data);
    return true;
  }

  end(): void {
    this.writableEnded = true;
    this.emit("close");
  }

  destroy(): void {
    this.destroyed = true;
    this.emit("close");
  }
}

describe("SSE Service Tests", () => {
  let mockRes1: MockResponse;
  let mockRes2: MockResponse;
  let mockRes3: MockResponse;

  beforeEach(() => {
    // Clear service state before each test
    (sseService as any).clients.clear();

    mockRes1 = new MockResponse();
    mockRes2 = new MockResponse();
    mockRes3 = new MockResponse();
  });

  afterEach(() => {
    // Clean up all connections
    (sseService as any).clients.clear();
  });

  // Skip sending to destroyed connection (coverage for line 46)
  it("should skip destroyed connection (destroyed=true) and clean it up", () => {
    sseService.addClient("user1", mockRes1 as unknown as Response);
    sseService.addClient("user1", mockRes2 as unknown as Response);

    // Mark first response as destroyed
    mockRes1.destroyed = true;

    sseService.send("user1", "test", { data: "value" });

    // Only mockRes2 should have received the message
    expect(mockRes2.writtenData.length).toBe(1);
    expect(mockRes1.writtenData.length).toBe(0);

    // mockRes1 should be removed from clients
    const clients = (sseService as any).clients.get("user1");
    expect(clients?.size).toBe(1);
    expect(clients?.has(mockRes2 as unknown as Response)).toBe(true);
  });

  // Test Case 13: Remove client on write error
  it("should remove client when write throws error", () => {
    sseService.addClient("user1", mockRes1 as unknown as Response);

    // Make write throw error
    mockRes1.shouldThrowOnWrite = true;

    sseService.send("user1", "test", { data: "value" });

    // Client should be removed after error
    const clients = (sseService as any).clients;
    expect(clients.has("user1")).toBe(false);
  });

  // Clear handles write errors gracefully
  it("should handle errors during clear", () => {
    const errorRes = new MockResponse();
    sseService.addClient("user1", errorRes as unknown as Response);

    // Make end() throw error
    errorRes.end = jest.fn(() => {
      throw new Error("End error");
    });

    // Should not throw
    sseService.clear();

    const clients = (sseService as any).clients;
    expect(clients.size).toBe(0);
  });
});
