import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout/Layout';
import LoadingSpinner from '../components/LoadingSpinner';
import apiService from '../services/api';

const ArtifactsPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const result = await apiService.getArtifacts();
        setData(result);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <Layout>
        <LoadingSpinner message="Loading artifacts..." />
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="alert alert-danger">Error loading artifacts: {error}</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="row">
        <div className="col-md-12">
          <h2>
            <span className="glyphicon glyphicon-picture" aria-hidden="true"></span> Artifacts
          </h2>
          <p className="lead">Browse media, documents, and other artifacts</p>
          
          <div className="panel panel-default">
            <div className="panel-heading">
              <h3 className="panel-title">Recent Artifacts</h3>
            </div>
            <ul className="list-group">
              {data?.artifacts && data.artifacts.length > 0 ? (
                data.artifacts.map((artifact: any) => (
                  <li key={artifact._id} className="list-group-item">
                    <h4>
                      <Link to={`/artifacts/entry/${artifact.friendlyUrl}/${artifact._id}`}>
                        {artifact.title}
                      </Link>
                    </h4>
                    {artifact.contentPreview && (
                      <p className="text-muted">{artifact.contentPreview}</p>
                    )}
                    {artifact.file && (
                      <div className="text-muted">
                        <small>
                          <span className="glyphicon glyphicon-file"></span> {artifact.file.type} - {artifact.file.name}
                        </small>
                      </div>
                    )}
                    <small className="text-muted">
                      Edited by {artifact.editorUsername} on {new Date(artifact.editDate).toLocaleDateString()}
                    </small>
                  </li>
                ))
              ) : (
                <li className="list-group-item">No artifacts found.</li>
              )}
            </ul>
          </div>

          <div className="text-center">
            <Link to="/" className="btn btn-default">
              <span className="glyphicon glyphicon-home"></span> Back to Home
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ArtifactsPage;
