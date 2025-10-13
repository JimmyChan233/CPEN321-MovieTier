import { Response } from 'express';

type UserId = string;

interface Client {
  userId: UserId;
  res: Response;
}

class SseService {
  private clients: Map<UserId, Set<Response>> = new Map();

  addClient(userId: UserId, res: Response) {
    if (!this.clients.has(userId)) {
      this.clients.set(userId, new Set());
    }
    this.clients.get(userId)!.add(res);
  }

  removeClient(userId: UserId, res: Response) {
    const set = this.clients.get(userId);
    if (set) {
      set.delete(res);
      if (set.size === 0) this.clients.delete(userId);
    }
  }

  send(userId: UserId, event: string, data: unknown) {
    const set = this.clients.get(userId);
    if (!set) return;
    const payload = `event: ${event}\n` + `data: ${JSON.stringify(data)}\n\n`;
    for (const res of set) {
      try {
        res.write(payload);
      } catch {
        // ignore broken pipe
      }
    }
  }
}

export const sseService = new SseService();

