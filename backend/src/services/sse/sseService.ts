import { Response } from 'express';
import { logger } from '../../utils/logger';

type UserId = string;

class SseService {
  private clients = new Map<UserId, Set<Response>>();

  addClient(userId: UserId, res: Response) {
    if (!this.clients.has(userId)) {
      this.clients.set(userId, new Set());
    }
    const clientSet = this.clients.get(userId);
    if (clientSet) {
      clientSet.add(res);
    }

    // Clean up when client disconnects
    res.on('close', () => {
      this.removeClient(userId, res);
    });
  }

  removeClient(userId: UserId, res: Response) {
    const set = this.clients.get(userId);
    if (set) {
      set.delete(res);
      if (set.size === 0) {
        this.clients.delete(userId);
      }
    }
  }

  send(userId: UserId, event: string, data: unknown) {
    const set = this.clients.get(userId);
    if (!set) return;

    const payload = `event: ${event}\n` + `data: ${JSON.stringify(data)}\n\n`;
    const toRemove: Response[] = [];

    for (const res of set) {
      try {
        if (!res.writableEnded && !res.destroyed) {
          res.write(payload);
        } else {
          toRemove.push(res);
        }
      } catch (err) {
        // Connection closed or error writing to response
        toRemove.push(res);
      }
    }

    // Clean up closed connections
    toRemove.forEach(res => this.removeClient(userId, res));
  }

  /**
   * Gracefully close all SSE connections (for server shutdown)
   */
  clear() {
    logger.info('Closing all SSE connections...');
    for (const [userId, clients] of this.clients.entries()) {
      for (const res of clients) {
        try {
          if (!res.writableEnded && !res.destroyed) {
            res.end();
          }
        } catch (err) {
          // Response already closed
        }
      }
      this.clients.delete(userId);
    }
    logger.success('All SSE connections closed');
  }
}

export const sseService = new SseService();

