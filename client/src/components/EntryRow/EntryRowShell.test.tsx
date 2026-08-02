import React from 'react';
import type { Answer, Argument, Artifact, Issue, Opinion, Question, Topic } from '../../types';
import { render } from '../../test-utils/render';
import AnswerEntryRow from './AnswerEntryRow';
import ArgumentEntryRow from './ArgumentEntryRow';
import ArtifactEntryRow from './ArtifactEntryRow';
import IssueEntryRow from './IssueEntryRow';
import OpinionEntryRow from './OpinionEntryRow';
import QuestionEntryRow from './QuestionEntryRow';
import TopicEntryRow from './TopicEntryRow';

const baseEntry = {
  _id: 'entry-1',
  friendlyUrl: 'sample-entry',
  title: 'Sample entry',
  private: false,
};

const cases: Array<{
  entryType: string;
  glyphClassName: string;
  renderRow: () => React.ReactElement;
}> = [
  {
    entryType: 'topic',
    glyphClassName: 'fa-folder-open',
    renderRow: () => <TopicEntryRow topic={baseEntry as unknown as Topic} />,
  },
  {
    entryType: 'argument',
    glyphClassName: 'glyphicon-flash',
    renderRow: () => <ArgumentEntryRow argument={baseEntry as unknown as Argument} />,
  },
  {
    entryType: 'question',
    glyphClassName: 'glyphicon-question-sign',
    renderRow: () => <QuestionEntryRow question={baseEntry as unknown as Question} />,
  },
  {
    entryType: 'answer',
    glyphClassName: 'fa-check-circle-o',
    renderRow: () => <AnswerEntryRow answer={baseEntry as unknown as Answer} />,
  },
  {
    entryType: 'artifact',
    glyphClassName: 'fa-puzzle-piece',
    renderRow: () => <ArtifactEntryRow artifact={baseEntry as unknown as Artifact} />,
  },
  {
    entryType: 'issue',
    glyphClassName: 'fa-exclamation-triangle',
    renderRow: () => <IssueEntryRow issue={baseEntry as unknown as Issue} />,
  },
  {
    entryType: 'opinion',
    glyphClassName: 'fa-comment',
    renderRow: () => <OpinionEntryRow opinion={baseEntry as unknown as Opinion} />,
  },
];

describe('EntryRowShell', () => {
  it.each(cases)(
    'gives $entryType rows the shared icon-column contract',
    ({ entryType, glyphClassName, renderRow }) => {
      const { container } = render(<ul className="list-group wt-list">{renderRow()}</ul>);
      const row = container.querySelector('[data-id="entry-1"]');
      const iconColumn = row?.firstElementChild;

      expect(row).toHaveClass('list-group-item', 'wt-entry-row');
      expect(row).toHaveAttribute('data-type', entryType);
      expect(iconColumn).toHaveClass('wt-entry-row-icon');
      expect(iconColumn).toHaveAttribute('aria-hidden', 'true');
      expect(iconColumn?.firstElementChild).toHaveClass(glyphClassName);
      expect(iconColumn?.nextElementSibling).toHaveClass('wt-entry-row-main');
    }
  );
});
