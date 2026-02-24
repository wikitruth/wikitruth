import LoadingSpinner from '../components/LoadingSpinner';

const meta = {
  title: 'Feedback/LoadingSpinner',
  component: LoadingSpinner,
  args: {
    message: 'Loading wikitruth entries...',
  },
};

export default meta;

export const Default = {};

export const ShortMessage = {
  args: {
    message: 'One moment',
  },
};
