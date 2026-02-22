export const formatDate = (value: string | Date) => {
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleDateString();
};

export const formatNumber = (value: number) => {
  return value.toLocaleString();
};

export default {
  formatDate,
  formatNumber,
};
