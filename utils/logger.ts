'use strict';

function emit(level, event, fields) {
  const payload = {
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

function info(event, fields) {
  emit('info', event, fields || {});
}

function error(event, fields) {
  emit('error', event, fields || {});
}

module.exports = {
  info: info,
  error: error,
};
