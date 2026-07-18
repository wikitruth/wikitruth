'use strict';

import type { Router } from 'express';
import type { WikitruthRequest, WikitruthResponse } from '../../types/http';
import type { RealtimeEvent } from '../../services/realtimeEvents';

import {
  subscribeRealtime,
  getRealtimeSubscriberCount,
  getRealtimeAdapterName,
} from '../../services/realtimeEvents';

const HEARTBEAT_INTERVAL_MS = 30_000;

function writeSseMessage(res: WikitruthResponse, payload: RealtimeEvent): void {
  res.write('event: message\n');
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

export = function (router: Router) {
  router.get('/events', function (req: WikitruthRequest, res: WikitruthResponse) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const maybeFlushable = res as WikitruthResponse & { flushHeaders?: () => void };
    maybeFlushable.flushHeaders?.();

    writeSseMessage(res, {
      type: 'connected',
      requestId: req.requestId || null,
      timestamp: new Date().toISOString(),
      data: {
        subscribers: getRealtimeSubscriberCount() + 1,
        adapter: getRealtimeAdapterName(),
        user: req.user?.username || null,
      },
    });

    const unsubscribe = subscribeRealtime((event) => {
      writeSseMessage(res, event);
    });

    const heartbeatId = setInterval(() => {
      writeSseMessage(res, {
        type: 'heartbeat',
        requestId: req.requestId || null,
        timestamp: new Date().toISOString(),
      });
    }, HEARTBEAT_INTERVAL_MS);

    req.on('close', function () {
      clearInterval(heartbeatId);
      unsubscribe();
      res.end();
    });
  });
};
