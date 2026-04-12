'use strict';

const { readBackendSource } = require('./helpers/readBackendSource');

function read(relativePath) {
  return readBackendSource(relativePath);
}

describe('Realtime event channel smoke coverage', function () {
  it('publishes monitoring errors to realtime subscribers', function () {
    const monitoringApi = read('server/src/controllers/api/monitoring.ts');

    expect(monitoringApi).toContain('publishRealtimeEvent({');
    expect(monitoringApi).toContain("type: 'monitoring.error'");
    expect(monitoringApi).toContain("type: 'monitoring.csp'");
  });

  it('maintains a shared realtime event bus service', function () {
    const realtimeEventsService = read('server/src/services/realtimeEvents.ts');

    expect(realtimeEventsService).toContain('function subscribeRealtime(');
    expect(realtimeEventsService).toContain('function publishRealtimeEvent(');
    expect(realtimeEventsService).toContain('function getRealtimeSubscriberCount(');
  });
});
