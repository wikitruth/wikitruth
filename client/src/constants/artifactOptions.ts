export const ARTIFACT_TYPE_OPTIONS = [
  { value: 'document', label: 'Document' },
  { value: 'image', label: 'Image' },
  { value: 'audio', label: 'Audio recording' },
  { value: 'video', label: 'Video recording' },
  { value: 'dataset', label: 'Dataset' },
  { value: 'web_capture', label: 'Web capture' },
  { value: 'physical_record', label: 'Physical record' },
  { value: 'testimony', label: 'Testimony' },
  { value: 'other', label: 'Other' },
];

export const ORIGIN_TYPE_OPTIONS = [
  { value: 'primary', label: 'Primary source' },
  { value: 'secondary', label: 'Secondary source' },
  { value: 'derived', label: 'Derived material' },
  { value: 'unknown', label: 'Unknown origin' },
];

export interface ArtifactProvenanceInput {
  artifactType: string;
  originType: string;
  sourceCreator: string;
  publisher: string;
  publicationDate: string;
  captureDate: string;
  archiveUrl: string;
  checksum: string;
  accessLimitations: string;
  verifiabilityNotes: string;
}

export const EMPTY_ARTIFACT_PROVENANCE: ArtifactProvenanceInput = {
  artifactType: 'document',
  originType: 'unknown',
  sourceCreator: '',
  publisher: '',
  publicationDate: '',
  captureDate: '',
  archiveUrl: '',
  checksum: '',
  accessLimitations: '',
  verifiabilityNotes: '',
};
