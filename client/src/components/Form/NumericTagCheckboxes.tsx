import React from 'react';

export type NumericTagOption = {
  value: number;
  label: string;
  help?: string;
};

type NumericTagCheckboxesProps = {
  name: string;
  label?: string;
  value: string;
  options: NumericTagOption[];
  onChange: (value: string) => void;
};

function selectedValues(value: string): Set<number> {
  return new Set(value
    .split(',')
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isInteger(item) && item > 0));
}

const NumericTagCheckboxes: React.FC<NumericTagCheckboxesProps> = ({
  name,
  label = 'Tags',
  value,
  options,
  onChange,
}) => {
  const selected = selectedValues(value);

  const toggle = (tag: number, checked: boolean) => {
    if (checked) {
      selected.add(tag);
    } else {
      selected.delete(tag);
    }
    onChange(Array.from(selected).sort((left, right) => left - right).join(','));
  };

  return (
    <fieldset className="form-group">
      <legend style={{ fontSize: '14px', fontWeight: 700, border: 0, marginBottom: '5px' }}>{label}</legend>
      <div className="row">
        {options.map((option) => (
          <div className="col-sm-6" key={option.value}>
            <div className="checkbox">
              <label htmlFor={`${name}-${option.value}`}>
                <input
                  id={`${name}-${option.value}`}
                  name={name}
                  type="checkbox"
                  value={option.value}
                  checked={selected.has(option.value)}
                  onChange={(event) => toggle(option.value, event.target.checked)}
                />{' '}
                <strong>{option.label}</strong>
                {option.help ? <span className="help-block" style={{ margin: 0 }}>{option.help}</span> : null}
              </label>
            </div>
          </div>
        ))}
      </div>
    </fieldset>
  );
};

export default NumericTagCheckboxes;
