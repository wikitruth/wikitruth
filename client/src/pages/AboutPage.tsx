import React from 'react';
import { Link } from 'react-router-dom';

const AboutPage: React.FC = () => {
  return (
    <div>
      <h1 className="page-header wt-header">About Wikitruth</h1>

      <div className="lead" style={{ marginBottom: '30px' }}>
        A systematic discourse and knowledge contribution using dialectics and vetting
        to verify knowledge that is true or false, right or wrong, and good or bad.
      </div>

      <div className="row">
        <div className="col-md-6">
          <h3><i className="fa fa-lightbulb-o"></i> Our Mission</h3>
          <p>
            The Wikitruth Project aims to make a better world by finding the truth and facts 
            of reality in all aspects of human knowledge, and present them in a way that is 
            easy to search and understand by laypeople.
          </p>
          <p>
            We do this by finding the truth using a systematic way of contribution and 
            organization of arguments and evidences contrasted with reality and known facts.
          </p>
        </div>
        <div className="col-md-6">
          <h3><i className="fa fa-cogs"></i> How It Works</h3>
          <p>
            An argument or a topic will be broken down into the smallest pieces necessary 
            to rationally discuss and conclude its reliability and truthfulness.
          </p>
          <p>
            A set of contribution and discussion rules will be enforced by the system 
            (automated) to prevent chaotic discussions, along with human critical thinking, 
            moral intent and the collective effort of everyone wanting to find the truth.
          </p>
        </div>
      </div>

      <div className="row" style={{ marginTop: '30px' }}>
        <div className="col-md-6">
          <h3><i className="fa fa-users"></i> Community</h3>
          <p>
            This is an open research and an attempt to collect all verifiable facts and 
            allow everyone to contribute, challenge the arguments with all sort of doubts 
            and questions they can think of.
          </p>
          <p>
            Eventually, we can come up with a "golden source" of truth and facts of reality 
            that survived all the challenges, hardened and supported by all available 
            evidences and arguments.
          </p>
        </div>
        <div className="col-md-6">
          <h3><i className="fa fa-compass"></i> Our Vision</h3>
          <p>
            If people know the truth, there will be less disagreements, less conflicts, 
            better governance and politics, better education system, better environment, 
            better relationship between humans, better health, more love and there will be peace.
          </p>
        </div>
      </div>

      <div style={{ marginTop: '50px', paddingTop: '30px', borderTop: '1px solid #eee' }}>
        <h3><i className="fa fa-envelope"></i> Contact</h3>
        <p>
          Feel free to send feedback to{' '}
          <a href="mailto:wikitruth.project@gmail.com">wikitruth.project@gmail.com</a>
          {' '}or start a discussion on{' '}
          <a href="https://www.facebook.com/wikitruth.project" target="_blank" rel="noopener noreferrer">
            Facebook
          </a>.
        </p>
      </div>

      <div style={{ marginTop: '30px' }}>
        <Link to="/" className="btn btn-primary">
          <i className="fa fa-home"></i> Back to Home
        </Link>
      </div>
    </div>
  );
};

export default AboutPage;
