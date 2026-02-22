export const isRequired = (value: string) => value.trim().length > 0;

export const isEmail = (value: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
};

export default {
  isRequired,
  isEmail,
};
