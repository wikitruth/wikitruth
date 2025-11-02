import React from 'react';
import { Link } from 'react-router-dom';

const VisualizePage: React.FC = () => {
  return (
    <div>
      <h1 className="page-header">
        <i className="fa fa-snowflake-o"></i> Visualize
      </h1>

      <div className="alert alert-info">
        <h4><i className="fa fa-info-circle"></i> Interactive Visualization</h4>
        <p>
          The visualization feature allows you to explore topics and their relationships
          in an interactive graph format. This feature will display a network of interconnected
          topics, arguments, and questions.
        </p>
      </div>

      <div className="panel panel-default">
        <div className="panel-heading">
          <h3 className="panel-title">Coming Soon</h3>
        </div>
        <div className="panel-body">
          <p>
            The visualization component is under development. It will provide:
          </p>
          <ul>
            <li>Interactive network graph of topics and relationships</li>
            <li>Zoom and pan controls</li>
            <li>Filter by topic, argument, or question</li>
            <li>Click to navigate to detailed views</li>
            <li>Color-coded nodes by verdict status</li>
          </ul>
        </div>
      </div>

      <div style={{ marginTop: '30px' }}>
        <Link to="/" className="btn btn-primary">
          <i className="fa fa-home"></i> Back to Home
        </Link>
      </div>
    </div>
  );
};

export default VisualizePage;
