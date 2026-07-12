'use strict';

const fs = require('fs');
const path = require('path');

function read(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

const contracts = [
  {
    family: 'topic',
    legacy: 'legacy/templates/dust/wiki/topics/create.dust',
    modern: ['client/src/pages/TopicCreatePage.tsx', 'server/src/controllers/api/topics.ts'],
    fields: {
      title: ['name="title"'],
      content: ['name="description"'],
      contextTitle: ['name="contextTitle"'],
      references: ['name="references"'],
      parent: ['name="category"'],
      referenceDate: ['name="referenceDate"'],
      topicTags: ['name="topicTags"'],
      hasEthicalValue: ['name="hasEthicalValue"'],
      icon: ['name="icon"'],
    },
  },
  {
    family: 'argument',
    legacy: 'legacy/templates/dust/wiki/arguments/create.dust',
    modern: ['client/src/pages/ArgumentCreatePage.tsx', 'server/src/controllers/api/argumentWrites.ts'],
    fields: {
      title: ['name="title"'],
      content: ['name="description"'],
      parent: ['name="parentId"'],
      references: ['name="sources"'],
      supportsParent: ['name="relationship"', 'supportsParent:'],
      referenceDate: ['name="referenceDate"'],
      typeId: ['name="typeId"'],
      argumentTags: ['name="argumentTags"'],
      hasEthicalValue: ['name="hasEthicalValue"'],
      author: ['createUserId: req.user._id'],
    },
  },
  {
    family: 'question',
    legacy: 'legacy/templates/dust/wiki/questions/create.dust',
    modern: ['client/src/pages/QuestionCreatePage.tsx', 'server/src/controllers/api/questions.ts'],
    fields: { title: ['name="title"'], content: ['name="description"'], references: ['name="references"'] },
  },
  {
    family: 'answer',
    legacy: 'legacy/templates/dust/wiki/answers/create.dust',
    modern: ['client/src/pages/AnswerCreatePage.tsx', 'server/src/controllers/api/answers.ts'],
    fields: { title: ['name="title"'], content: ['name="description"'], references: ['name="references"'] },
  },
  {
    family: 'issue',
    legacy: 'legacy/templates/dust/wiki/issues/create.dust',
    modern: ['client/src/pages/IssueCreatePage.tsx', 'server/src/controllers/api/issues.ts'],
    fields: { title: ['name="title"'], content: ['name="description"'], issueType: ['name="issueType"'], optionsRadios: ['name="ownerId"'] },
  },
  {
    family: 'opinion',
    legacy: 'legacy/templates/dust/wiki/opinions/create.dust',
    modern: ['client/src/pages/OpinionCreatePage.tsx', 'server/src/controllers/api/opinions.ts'],
    fields: { title: ['name="title"'], content: ['name="description"'], parent: ['parentIdFromQuery', 'parentId: parentIdFromQuery'] },
  },
  {
    family: 'artifact',
    legacy: 'legacy/templates/dust/wiki/artifacts/create.dust',
    modern: [
      'client/src/pages/ArtifactCreatePage.tsx',
      'client/src/components/Artifacts/ArtifactProvenanceFields.tsx',
      'server/src/controllers/api/artifacts.ts',
    ],
    fields: {
      title: ['name="title"'],
      content: ['name="description"'],
      source: ['name="source"'],
      parent: ['name="parentId"'],
      inlineFile: ['name="inlineFile"'],
      typeId: ['name="typeId"'],
      artifactTags: ['name="artifactTags"'],
      author: ['name="sourceCreator"'],
    },
  },
];

describe('legacy and modern create/edit field parity', () => {
  test.each(contracts)('$family preserves every legacy semantic field', ({ legacy, modern, fields }) => {
    const legacySource = read(legacy);
    const modernSource = modern.map(read).join('\n');

    Object.entries(fields).forEach(([legacyField, modernTokens]) => {
      expect(legacySource).toContain(`name="${legacyField}"`);
      modernTokens.forEach((token) => expect(modernSource).toContain(token));
    });
  });

  it('keeps legacy author selection from becoming an identity-spoofing input', () => {
    const modernArgument = read('client/src/pages/ArgumentCreatePage.tsx');
    expect(modernArgument).not.toContain('name="author"');
    expect(read('server/src/controllers/api/argumentWrites.ts')).toContain('createUserId: req.user._id');
  });
});
