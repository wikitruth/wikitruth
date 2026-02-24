import React from 'react';

const HelpUsPage: React.FC = () => {
  return (
    <div className="container">
      <h2>Help Us</h2>
      <p className="text-muted">Contribute to product quality, moderation, and documentation.</p>
      <ul>
        <li>Submit fact-checked arguments, issues, and opinions.</li>
        <li>Join community moderation groups and review queues.</li>
        <li>Report bugs and propose improvements through the project repository.</li>
      </ul>
      <p>
        <a href="https://github.com/wikitruth/wikitruth" target="_blank" rel="noopener noreferrer">
          Visit the source repository
        </a>
      </p>
    </div>
  );
};

export default HelpUsPage;
