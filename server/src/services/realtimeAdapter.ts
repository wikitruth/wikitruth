import type { RealtimeEvent } from './realtimeEvents';

export interface RealtimeDurableAdapter {
  name: string;
  publish: (event: RealtimeEvent) => Promise<void>;
  subscribe: (subscriber: (event: RealtimeEvent) => void) => () => void;
  close?: () => Promise<void> | void;
}
