'use strict';

import crypto from 'crypto';
import type { RealtimeDurableAdapter } from './realtimeAdapter';
import type { RealtimeEvent } from './realtimeEvents';

type RealtimeEventModel = {
  create: (value: Record<string, unknown>) => Promise<unknown>;
  find: (query: Record<string, unknown>) => {
    sort: (sort: Record<string, number>) => { limit: (limit: number) => { lean: () => Promise<RealtimeEventRow[]> } };
  };
};
type RealtimeEventRow = { _id?: unknown; eventId?: unknown; payload?: unknown; createDate?: unknown };

function eventModel(): RealtimeEventModel {
  // Load lazily after the application has registered all Mongoose models.
  const app = require('../app') as { db?: { models?: { RealtimeEvent?: RealtimeEventModel } } };
  const model = app.db?.models?.RealtimeEvent;
  if (!model) throw new Error('RealtimeEvent model is unavailable');
  return model;
}

export function createMongoRealtimeAdapter(): RealtimeDurableAdapter {
  const originId = `${process.pid}-${crypto.randomUUID()}`;
  const pollIntervalMs = Math.max(250, Number(process.env.REALTIME_MONGO_POLL_MS || 1000));
  const retentionHours = Math.max(1, Number(process.env.REALTIME_MONGO_RETENTION_HOURS || 24));
  const subscribers = new Set<(event: RealtimeEvent) => void>();
  const seen = new Set<string>();
  let cursor = new Date();
  let timer: NodeJS.Timeout | null = null;
  let polling = false;

  const remember = (eventId: string) => {
    seen.add(eventId);
    if (seen.size > 5000) seen.delete(seen.values().next().value as string);
  };

  const poll = async () => {
    if (polling || !subscribers.size) return;
    polling = true;
    try {
      const rows = await eventModel().find({ createDate: { $gte: cursor }, originId: { $ne: originId } })
        .sort({ createDate: 1, _id: 1 }).limit(500).lean();
      rows.forEach((row) => {
        const eventId = String(row.eventId || row._id || '');
        if (!eventId || seen.has(eventId)) return;
        remember(eventId);
        const date = new Date(String(row.createDate || Date.now()));
        if (date > cursor) cursor = date;
        subscribers.forEach((subscriber) => subscriber(row.payload as RealtimeEvent));
      });
    } catch (error) {
      console.error('Realtime Mongo adapter poll failed:', error instanceof Error ? error.message : error);
    } finally {
      polling = false;
    }
  };

  const start = () => {
    if (!timer) timer = setInterval(() => void poll(), pollIntervalMs);
  };

  return {
    name: 'mongo',
    async publish(event) {
      const now = new Date();
      await eventModel().create({
        eventId: crypto.randomUUID(), originId, payload: event, createDate: now,
        expiresAt: new Date(now.getTime() + retentionHours * 60 * 60 * 1000),
      });
    },
    subscribe(subscriber) {
      subscribers.add(subscriber);
      start();
      return () => {
        subscribers.delete(subscriber);
        if (!subscribers.size && timer) { clearInterval(timer); timer = null; }
      };
    },
    close() {
      if (timer) clearInterval(timer);
      timer = null;
      subscribers.clear();
    },
  };
}
