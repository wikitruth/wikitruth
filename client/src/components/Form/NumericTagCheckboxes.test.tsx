import React from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen } from '../../test-utils/render';
import NumericTagCheckboxes from './NumericTagCheckboxes';

describe('NumericTagCheckboxes', () => {
  it('adds and removes legacy numeric tags in deterministic order', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    const { rerender } = render(
      <NumericTagCheckboxes
        name="tags"
        value="20"
        options={[{ value: 20, label: 'Key' }, { value: 30, label: 'Extrapolation' }]}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole('checkbox', { name: /extrapolation/i }));
    expect(onChange).toHaveBeenLastCalledWith('20,30');

    rerender(
      <NumericTagCheckboxes
        name="tags"
        value="20,30"
        options={[{ value: 20, label: 'Key' }, { value: 30, label: 'Extrapolation' }]}
        onChange={onChange}
      />,
    );
    await user.click(screen.getByRole('checkbox', { name: /key/i }));
    expect(onChange).toHaveBeenLastCalledWith('30');
  });
});
