import Button from '../components/common/Button';

const meta = {
  title: 'Common/Button',
  component: Button,
  args: {
    children: 'Save Changes',
    variant: 'primary',
    size: 'md',
    disabled: false,
    icon: 'check',
  },
};

export default meta;

export const Primary = {};

export const Danger = {
  args: {
    variant: 'danger',
    children: 'Delete Entry',
    icon: 'trash',
  },
};

export const Disabled = {
  args: {
    disabled: true,
    children: 'Saving...',
    icon: 'spinner',
  },
};
