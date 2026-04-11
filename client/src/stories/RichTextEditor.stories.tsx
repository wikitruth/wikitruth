import React, { useState } from 'react';
import RichTextEditor from '../components/Form/RichTextEditor';

const meta = {
  title: 'Form/RichTextEditor',
  component: RichTextEditor,
  args: {
    name: 'content',
    value: '<p>Start typing here…</p>',
    label: 'Content',
  },
};

export default meta;

export const Default = {
  render: () => {
    const [value, setValue] = useState('<p>Hello <strong>world</strong></p>');
    return (
      <RichTextEditor
        name="content"
        value={value}
        onChange={(_name, html) => setValue(html)}
        label="Content"
      />
    );
  },
};

export const Compact = {
  render: () => {
    const [value, setValue] = useState('<p>Compact toolbar mode</p>');
    return (
      <RichTextEditor
        name="reply"
        value={value}
        onChange={(_name, html) => setValue(html)}
        label="Reply"
        compact
      />
    );
  },
};

export const WithError = {
  render: () => {
    const [value, setValue] = useState('');
    return (
      <RichTextEditor
        name="body"
        value={value}
        onChange={(_name, html) => setValue(html)}
        label="Body"
        required
        error="Content is required"
      />
    );
  },
};

export const WithPlaceholder = {
  render: () => {
    const [value, setValue] = useState('');
    return (
      <RichTextEditor
        name="notes"
        value={value}
        onChange={(_name, html) => setValue(html)}
        label="Notes"
        placeholder="Enter your notes here…"
      />
    );
  },
};
