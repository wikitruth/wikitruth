export const classNames = (...classes: Array<string | false | null | undefined>) => {
  return classes.filter(Boolean).join(' ');
};

export const truncate = (value: string, maxLength: number) => {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 3)}...`;
};
