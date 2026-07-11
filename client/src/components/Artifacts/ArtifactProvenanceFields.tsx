import React from 'react';

import Input from '../Form/Input';
import Select from '../Form/Select';
import {
  ARTIFACT_TYPE_OPTIONS,
  ORIGIN_TYPE_OPTIONS,
  type ArtifactProvenanceInput,
} from '../../constants/artifactOptions';

interface ArtifactProvenanceFieldsProps {
  value: ArtifactProvenanceInput;
  onChange: (value: ArtifactProvenanceInput) => void;
  disabled?: boolean;
}

const ArtifactProvenanceFields: React.FC<ArtifactProvenanceFieldsProps> = ({ value, onChange, disabled = false }) => {
  const update = (field: keyof ArtifactProvenanceInput, nextValue: string) => {
    onChange({ ...value, [field]: nextValue });
  };

  return (
    <fieldset disabled={disabled}>
      <legend style={{ fontSize: 16 }}>Evidence Provenance</legend>
      <Select
        name="artifactType"
        label="Artifact kind"
        value={value.artifactType}
        onChange={(event) => update('artifactType', event.target.value)}
        options={ARTIFACT_TYPE_OPTIONS}
      />
      <Select
        name="originType"
        label="Origin type"
        value={value.originType}
        onChange={(event) => update('originType', event.target.value)}
        options={ORIGIN_TYPE_OPTIONS}
      />
      <div className="row">
        <div className="col-sm-6">
          <Input name="sourceCreator" label="Creator or author" value={value.sourceCreator} onChange={(event) => update('sourceCreator', event.target.value)} />
        </div>
        <div className="col-sm-6">
          <Input name="publisher" label="Publisher or accountable organization" value={value.publisher} onChange={(event) => update('publisher', event.target.value)} />
        </div>
      </div>
      <div className="row">
        <div className="col-sm-6">
          <Input name="publicationDate" type="date" label="Publication date" value={value.publicationDate} onChange={(event) => update('publicationDate', event.target.value)} />
        </div>
        <div className="col-sm-6">
          <Input name="captureDate" type="datetime-local" label="Capture date and time" value={value.captureDate} onChange={(event) => update('captureDate', event.target.value)} />
        </div>
      </div>
      <Input name="archiveUrl" type="url" label="Archive URL" value={value.archiveUrl} onChange={(event) => update('archiveUrl', event.target.value)} placeholder="https://archive.example/..." />
      <Input name="checksum" label="Checksum or content hash" value={value.checksum} onChange={(event) => update('checksum', event.target.value)} placeholder="sha256:..." />
      <div className="form-group">
        <label htmlFor="accessLimitations">Access limitations</label>
        <textarea id="accessLimitations" className="form-control" rows={2} value={value.accessLimitations} onChange={(event) => update('accessLimitations', event.target.value)} />
      </div>
      <div className="form-group">
        <label htmlFor="verifiabilityNotes">Verifiability notes</label>
        <textarea id="verifiabilityNotes" className="form-control" rows={3} value={value.verifiabilityNotes} onChange={(event) => update('verifiabilityNotes', event.target.value)} placeholder="Explain how another reviewer can inspect or reproduce this evidence." />
      </div>
    </fieldset>
  );
};

export default ArtifactProvenanceFields;
