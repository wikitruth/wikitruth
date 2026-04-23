'use strict';

type LogLevel = 'info' | 'error';
type LogFields = Record<string, unknown>;

interface LogPayload extends LogFields {
  timestamp: string;
  level: LogLevel;
  event: string;
}

function emit(level: LogLevel, event: string, fields: LogFields = {}): void {
  const payload: LogPayload = {
    timestamp: new Date().toISOString(),
    level: level,
    event: event,
    ...fields,
  };

  const line = JSON.stringify(payload);
  if (level === 'error') {
    console.error(line);
    return;
  }

  console.log(line);
}

function info(event: string, fields: LogFields = {}): void {
  emit('info', event, fields);
}

function error(event: string, fields: LogFields = {}): void {
  emit('error', event, fields);
}

export { info, error };
