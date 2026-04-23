'use strict';

import * as events from 'events';

interface WorkflowOutcome {
  success: boolean;
  errors: string[];
  errfor: Record<string, string>;
}

interface Workflow extends InstanceType<typeof events.EventEmitter> {
  outcome: WorkflowOutcome;
  hasErrors: () => boolean;
}

export default function createWorkflow(
  _req: import('express').Request,
  res: import('express').Response
): Workflow {
  const workflow = new events.EventEmitter() as Workflow;

  workflow.outcome = {
    success: false,
    errors: [],
    errfor: {},
  };

  workflow.hasErrors = function (): boolean {
    return Object.keys(workflow.outcome.errfor).length !== 0 || workflow.outcome.errors.length !== 0;
  };

  workflow.on('exception', function (err: unknown) {
    workflow.outcome.errors.push('Exception: ' + String(err));
    workflow.emit('response');
  });

  workflow.on('response', function () {
    workflow.outcome.success = !workflow.hasErrors();
    res.send(workflow.outcome);
  });

  return workflow;
};
