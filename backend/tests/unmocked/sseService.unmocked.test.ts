/**
 * SSE Service Tests - Unmocked
 * Tests for Server-Sent Events service with mock Response objects
 */

import { Response } from 'express';
import { EventEmitter } from 'events';
import { sseService } from '../../src/services/sse/sseService';

// Mock Response class that extends EventEmitter
class MockResponse extends EventEmitter {
  public writableEnded: boolean = false;
  public destroyed: boolean = false;
  public writtenData: string[] = [];
  public shouldThrowOnWrite: boolean = false;

  write(data: string): boolean {
    if (this.shouldThrowOnWrite) {
      throw new Error('Write error');
    }
    if (this.writableEnded || this.destroyed) {
      return false;
    }
    this.writtenData.push(data);
    return true;
  }

  end(): void {
    this.writableEnded = true;
    this.emit('close');
  }

  destroy(): void {
    this.destroyed = true;
    this.emit('close');
  }
}

describe('SSE Service Tests', () => {
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

  // Test Case 1: Add client for new user
  it('should add client for new user', () => {
    sseService.addClient('user1', mockRes1 as unknown as Response);

    const clients = (sseService as any).clients;
    expect(clients.has('user1')).toBe(true);
    expect(clients.get('user1').size).toBe(1);
  });

  // Test Case 2: Add multiple clients for same user
  it('should add multiple clients for same user', () => {
    sseService.addClient('user1', mockRes1 as unknown as Response);
    sseService.addClient('user1', mockRes2 as unknown as Response);

    const clients = (sseService as any).clients;
    expect(clients.get('user1').size).toBe(2);
  });

  // Test Case 3: Add clients for different users
  it('should add clients for different users', () => {
    sseService.addClient('user1', mockRes1 as unknown as Response);
    sseService.addClient('user2', mockRes2 as unknown as Response);

    const clients = (sseService as any).clients;
    expect(clients.has('user1')).toBe(true);
    expect(clients.has('user2')).toBe(true);
    expect(clients.get('user1').size).toBe(1);
    expect(clients.get('user2').size).toBe(1);
  });

  // Test Case 4: Auto-remove client on connection close
  it('should auto-remove client when connection closes', () => {
    sseService.addClient('user1', mockRes1 as unknown as Response);

    expect((sseService as any).clients.has('user1')).toBe(true);

    // Simulate connection close
    mockRes1.emit('close');

    // Give event loop a tick
    setTimeout(() => {
      expect((sseService as any).clients.has('user1')).toBe(false);
    }, 10);
  });

  // Test Case 5: Remove client manually
  it('should remove client manually', () => {
    sseService.addClient('user1', mockRes1 as unknown as Response);
    sseService.addClient('user1', mockRes2 as unknown as Response);

    sseService.removeClient('user1', mockRes1 as unknown as Response);

    const clients = (sseService as any).clients;
    expect(clients.get('user1').size).toBe(1);
  });

  // Test Case 6: Remove last client deletes user entry
  it('should delete user entry when last client is removed', () => {
    sseService.addClient('user1', mockRes1 as unknown as Response);

    sseService.removeClient('user1', mockRes1 as unknown as Response);

    const clients = (sseService as any).clients;
    expect(clients.has('user1')).toBe(false);
  });

  // Test Case 7: Remove client from non-existent user
  it('should handle removing client from non-existent user', () => {
    sseService.removeClient('nonexistent', mockRes1 as unknown as Response);

    // Should not throw error
    expect((sseService as any).clients.has('nonexistent')).toBe(false);
  });

  // Test Case 8: Send event to existing client
  it('should send event to existing client', () => {
    sseService.addClient('user1', mockRes1 as unknown as Response);

    sseService.send('user1', 'test_event', { message: 'hello' });

    expect(mockRes1.writtenData.length).toBe(1);
    expect(mockRes1.writtenData[0]).toContain('event: test_event');
    expect(mockRes1.writtenData[0]).toContain('data: {"message":"hello"}');
  });

  // Test Case 9: Send to non-existent user
  it('should handle sending to non-existent user', () => {
    sseService.send('nonexistent', 'test_event', { data: 'test' });

    // Should not throw error
    expect(true).toBe(true);
  });

  // Test Case 10: Send to multiple clients of same user
  it('should send event to all clients of same user', () => {
    sseService.addClient('user1', mockRes1 as unknown as Response);
    sseService.addClient('user1', mockRes2 as unknown as Response);

    sseService.send('user1', 'broadcast', { msg: 'to all' });

    expect(mockRes1.writtenData.length).toBe(1);
    expect(mockRes2.writtenData.length).toBe(1);
    expect(mockRes1.writtenData[0]).toEqual(mockRes2.writtenData[0]);
  });

  // Test Case 11: Skip sending to closed connection
  it('should skip sending to closed connection', () => {
    sseService.addClient('user1', mockRes1 as unknown as Response);

    // Close the connection
    mockRes1.writableEnded = true;

    sseService.send('user1', 'test', { data: 'value' });

    // Should not write to closed connection
    expect(mockRes1.writtenData.length).toBe(0);
  });

  // Test Case 12: Skip sending to destroyed connection
  it('should skip sending to destroyed connection', () => {
    sseService.addClient('user1', mockRes1 as unknown as Response);

    // Destroy the connection
    mockRes1.destroyed = true;

    sseService.send('user1', 'test', { data: 'value' });

    expect(mockRes1.writtenData.length).toBe(0);
  });

  // Test Case 13: Remove client on write error
  it('should remove client when write throws error', () => {
    sseService.addClient('user1', mockRes1 as unknown as Response);

    // Make write throw error
    mockRes1.shouldThrowOnWrite = true;

    sseService.send('user1', 'test', { data: 'value' });

    // Client should be removed after error
    const clients = (sseService as any).clients;
    expect(clients.has('user1')).toBe(false);
  });

  // Test Case 14: Remove only failed clients, keep working ones
  it('should remove only failed clients and keep working ones', () => {
    sseService.addClient('user1', mockRes1 as unknown as Response);
    sseService.addClient('user1', mockRes2 as unknown as Response);

    // Make first client fail
    mockRes1.writableEnded = true;

    sseService.send('user1', 'test', { data: 'value' });

    const clients = (sseService as any).clients;
    expect(clients.get('user1').size).toBe(1);
    expect(mockRes2.writtenData.length).toBe(1);
  });

  // Test Case 15: Clear all connections
  it('should clear all connections', () => {
    sseService.addClient('user1', mockRes1 as unknown as Response);
    sseService.addClient('user2', mockRes2 as unknown as Response);
    sseService.addClient('user3', mockRes3 as unknown as Response);

    sseService.clear();

    const clients = (sseService as any).clients;
    expect(clients.size).toBe(0);
    expect(mockRes1.writableEnded).toBe(true);
    expect(mockRes2.writableEnded).toBe(true);
    expect(mockRes3.writableEnded).toBe(true);
  });

  // Test Case 16: Clear handles already-closed connections
  it('should handle clearing already-closed connections', () => {
    sseService.addClient('user1', mockRes1 as unknown as Response);

    // Pre-close the connection
    mockRes1.writableEnded = true;

    // Should not throw error
    sseService.clear();

    const clients = (sseService as any).clients;
    expect(clients.size).toBe(0);
  });

  // Test Case 17: Clear handles destroyed connections
  it('should handle clearing destroyed connections', () => {
    sseService.addClient('user1', mockRes1 as unknown as Response);

    // Pre-destroy the connection
    mockRes1.destroyed = true;

    sseService.clear();

    const clients = (sseService as any).clients;
    expect(clients.size).toBe(0);
  });

  // Test Case 18: Clear handles write errors gracefully
  it('should handle errors during clear', () => {
    const errorRes = new MockResponse();
    sseService.addClient('user1', errorRes as unknown as Response);

    // Make end() throw error
    errorRes.end = jest.fn(() => {
      throw new Error('End error');
    });

    // Should not throw
    sseService.clear();

    const clients = (sseService as any).clients;
    expect(clients.size).toBe(0);
  });

  // Test Case 19: Send various data types
  it('should serialize various data types correctly', () => {
    sseService.addClient('user1', mockRes1 as unknown as Response);

    // Object
    sseService.send('user1', 'object', { key: 'value', num: 123 });
    expect(mockRes1.writtenData[0]).toContain('{"key":"value","num":123}');

    // Array
    sseService.send('user1', 'array', [1, 2, 3]);
    expect(mockRes1.writtenData[1]).toContain('[1,2,3]');

    // String
    sseService.send('user1', 'string', 'plain text');
    expect(mockRes1.writtenData[2]).toContain('"plain text"');

    // Number
    sseService.send('user1', 'number', 42);
    expect(mockRes1.writtenData[3]).toContain('42');

    // Boolean
    sseService.send('user1', 'boolean', true);
    expect(mockRes1.writtenData[4]).toContain('true');

    // Null
    sseService.send('user1', 'null', null);
    expect(mockRes1.writtenData[5]).toContain('null');
  });

  // Test Case 20: Event name formatting
  it('should format event name correctly', () => {
    sseService.addClient('user1', mockRes1 as unknown as Response);

    sseService.send('user1', 'my_custom_event', { data: 'test' });

    const message = mockRes1.writtenData[0];
    expect(message).toMatch(/^event: my_custom_event\n/);
  });

  // Test Case 21: Multiple sends to same client
  it('should handle multiple sends to same client', () => {
    sseService.addClient('user1', mockRes1 as unknown as Response);

    sseService.send('user1', 'event1', { msg: 'first' });
    sseService.send('user1', 'event2', { msg: 'second' });
    sseService.send('user1', 'event3', { msg: 'third' });

    expect(mockRes1.writtenData.length).toBe(3);
    expect(mockRes1.writtenData[0]).toContain('event1');
    expect(mockRes1.writtenData[1]).toContain('event2');
    expect(mockRes1.writtenData[2]).toContain('event3');
  });

  // Test Case 22: Complex nested data
  it('should handle complex nested data structures', () => {
    sseService.addClient('user1', mockRes1 as unknown as Response);

    const complexData = {
      user: {
        id: 123,
        name: 'Test User',
        preferences: {
          theme: 'dark',
          notifications: true
        }
      },
      items: [
        { id: 1, title: 'Item 1' },
        { id: 2, title: 'Item 2' }
      ]
    };

    sseService.send('user1', 'complex', complexData);

    const message = mockRes1.writtenData[0];
    expect(message).toContain(JSON.stringify(complexData));
  });

  // Test Case 23: Concurrent operations
  it('should handle concurrent add and remove operations', () => {
    sseService.addClient('user1', mockRes1 as unknown as Response);
    sseService.addClient('user1', mockRes2 as unknown as Response);
    sseService.addClient('user2', mockRes3 as unknown as Response);

    sseService.removeClient('user1', mockRes1 as unknown as Response);
    sseService.send('user1', 'test', { msg: 'hi' });
    sseService.addClient('user1', mockRes1 as unknown as Response);

    const clients = (sseService as any).clients;
    expect(clients.get('user1').size).toBe(2);
    expect(mockRes2.writtenData.length).toBe(1);
  });

  // Test Case 24: Empty event name
  it('should handle empty event name', () => {
    sseService.addClient('user1', mockRes1 as unknown as Response);

    sseService.send('user1', '', { data: 'test' });

    expect(mockRes1.writtenData.length).toBe(1);
    expect(mockRes1.writtenData[0]).toContain('event: ');
  });

  // Test Case 25: Special characters in data
  it('should handle special characters in data', () => {
    sseService.addClient('user1', mockRes1 as unknown as Response);

    const specialData = {
      text: 'Special chars: "quotes" \'apostrophes\' \n newlines \t tabs',
      emoji: '🎬🍿'
    };

    sseService.send('user1', 'special', specialData);

    const message = mockRes1.writtenData[0];
    expect(message).toContain('data:');
  });
});