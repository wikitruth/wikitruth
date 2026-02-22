import { renderHook, act } from '@testing-library/react';
import useForm from './useForm';

describe('useForm', () => {
  it('tracks changes and submits valid form', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useForm({
        initialValues: { username: '', remember: false },
        onSubmit,
        validate: (values) => ({
          ...(values.username ? {} : { username: 'required' }),
        }),
      })
    );

    act(() => {
      result.current.handleChange({
        target: { name: 'username', value: 'demo', type: 'text' },
      } as React.ChangeEvent<HTMLInputElement>);
    });

    await act(async () => {
      await result.current.handleSubmit({ preventDefault: () => {} } as React.FormEvent<HTMLFormElement>);
    });

    expect(onSubmit).toHaveBeenCalledWith({ username: 'demo', remember: false });
  });
});
