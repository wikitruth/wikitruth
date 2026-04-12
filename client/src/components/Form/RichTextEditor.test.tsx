import React from 'react';
import userEvent from '@testing-library/user-event';
import { fireEvent, render, screen } from '../../test-utils/render';
import RichTextEditor from './RichTextEditor';

const chainState: Record<string, jest.Mock> = {};
let latestOptions: Record<string, unknown> | null = null;

const buildChain = () => {
  const chain: Record<string, jest.Mock> = {};
  const methods = [
    'focus',
    'toggleBold',
    'toggleItalic',
    'toggleUnderline',
    'toggleStrike',
    'toggleHeading',
    'toggleBulletList',
    'toggleOrderedList',
    'toggleBlockquote',
    'toggleCodeBlock',
    'extendMarkRange',
    'setLink',
    'unsetLink',
    'setImage',
    'insertTable',
    'setHorizontalRule',
    'undo',
    'redo',
    'run',
  ];
  methods.forEach((method) => {
    chain[method] = jest.fn(() => chain);
  });
  return chain;
};

const fakeEditor = {
  chain: jest.fn(() => {
    const chain = buildChain();
    Object.assign(chainState, chain);
    return chain;
  }),
  isActive: jest.fn(() => false),
  can: jest.fn(() => ({
    undo: () => true,
    redo: () => true,
  })),
  getAttributes: jest.fn(() => ({})),
  getHTML: jest.fn(() => '<p>updated</p>'),
};

jest.mock('@tiptap/react', () => ({
  useEditor: (options: Record<string, unknown>) => {
    latestOptions = options;
    return fakeEditor;
  },
  EditorContent: () => (
    <textarea
      data-testid="rte-content"
      onChange={(event) => {
        const target = event.target as HTMLTextAreaElement;
        fakeEditor.getHTML.mockReturnValue(target.value || '<p>updated</p>');
        (latestOptions?.onUpdate as ((payload: { editor: typeof fakeEditor }) => void) | undefined)?.({
          editor: fakeEditor,
        });
      }}
      onBlur={() => {
        (latestOptions?.onBlur as (() => void) | undefined)?.();
      }}
    />
  ),
}));

describe('RichTextEditor', () => {
  beforeEach(() => {
    Object.keys(chainState).forEach((key) => delete chainState[key]);
    latestOptions = null;
    jest.clearAllMocks();
  });

  it('renders full toolbar controls', () => {
    render(
      <RichTextEditor
        name="content"
        label="Content"
        value="<p>Hello</p>"
        onChange={jest.fn()}
      />,
    );

    expect(screen.getByText('Content')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /bold/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /heading 1/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /insert image/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /insert table/i })).toBeInTheDocument();
  });

  it('hides heading and media controls in compact mode', () => {
    render(
      <RichTextEditor
        name="content"
        label="Reply"
        value="<p>Hello</p>"
        onChange={jest.fn()}
        compact
      />,
    );

    expect(screen.queryByRole('button', { name: /heading 1/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /insert image/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /insert table/i })).not.toBeInTheDocument();
  });

  it('calls onChange with updated html content', async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    render(
      <RichTextEditor
        name="description"
        value="<p>Initial</p>"
        onChange={onChange}
      />,
    );

    await user.type(screen.getByTestId('rte-content'), 'Updated');
    expect(onChange).toHaveBeenCalledWith('description', 'Updated');
  });

  it('calls onBlur callback', () => {
    const onBlur = jest.fn();
    render(
      <RichTextEditor
        name="description"
        value="<p>Initial</p>"
        onChange={jest.fn()}
        onBlur={onBlur}
      />,
    );

    fireEvent.blur(screen.getByTestId('rte-content'));
    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  it('executes bold action from toolbar', async () => {
    const user = userEvent.setup();
    render(
      <RichTextEditor
        name="description"
        value="<p>Initial</p>"
        onChange={jest.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: /bold/i }));
    expect(chainState.focus).toHaveBeenCalled();
    expect(chainState.toggleBold).toHaveBeenCalled();
    expect(chainState.run).toHaveBeenCalled();
  });
});
