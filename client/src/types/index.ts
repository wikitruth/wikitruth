export interface User {
  _id: string;
  username: string;
  email?: string;
  name?: string | {
    first?: string;
    last?: string;
    full?: string;
  };
  roles?: {
    admin?: string;
    screener?: boolean;
    reviewer?: boolean;
  };
  onboarding?: {
    contributor?: {
      completed?: boolean;
      policyVersion?: string;
      acknowledgements?: string[];
      completedDate?: Date | string;
    };
    reviewer?: {
      completed?: boolean;
      policyVersion?: string;
      acknowledgements?: string[];
      completedDate?: Date | string;
      assignedDate?: Date | string;
    };
  };
  preferences?: {
    privateProfile?: boolean;
  };
  createdDate?: Date;
  isActive?: string;
  reputation?: ReputationSnapshot | null;
}

export interface ReputationSnapshot {
  score: number;
  level: string;
  dimensions: {
    quality: number;
    participation: number;
    stewardship: number;
    evidence: number;
  };
  counts: {
    contributions: number;
    acceptedContributions: number;
    rejectedContributions: number;
    acceptedArtifacts: number;
    artifactReviews: number;
    verdictVotes: number;
    privilegedActions: number;
    acceptedChangeRequests: number;
    rejectedChangeRequests: number;
  };
  badges: Array<{ key: string; label: string; description: string }>;
  formulaVersion: string;
  calculatedAt: string;
}

export interface Application {
  _id?: string;
  id?: string;
  title?: string;
  name?: string;
  navTitle?: string;
  slogan?: string;
  logoIcon?: string;
  homeUrl?: string;
  aboutUrl?: string;
  exploreUrl?: string;
  exploreTopicId?: string;
  domains?: string[];
  resPath?: string;
  civicTenant?: import('./civic').CivicTenant;
  jumbotron?: {
    title: string;
    description: string;
  };
  sections?: Array<{
    title: string;
    description: string;
    iconClass: string;
    url?: string;
  }>;
}

export interface Topic {
  _id: string;
  title: string;
  friendlyUrl: string;
  description?: string;
  parentId?: string;
  categoryId?: string;
  private?: boolean;
  screening?: {
    status: string | number;
  };
  editDate?: Date;
  createDate?: Date;
  editorId?: string;
  editorUsername?: string;
  childrenCount?: {
    topics?: {
      total?: number;
      accepted?: number;
      pending?: number;
      rejected?: number;
    };
    arguments?: {
      total?: number;
      accepted?: number;
      pending?: number;
      rejected?: number;
    };
    questions?: {
      total?: number;
      accepted?: number;
      pending?: number;
      rejected?: number;
    };
    artifacts?: {
      total?: number;
      accepted?: number;
      pending?: number;
      rejected?: number;
    };
  };
}

export interface Argument {
  _id: string;
  title: string;
  friendlyUrl: string;
  description?: string;
  ownerType: string;
  ownerId?: string;
  private?: boolean;
  screening?: {
    status: string | number;
  };
  verdict?: {
    result: string;
  };
  editDate?: Date;
  createDate?: Date;
  editorId?: string;
  editorUsername?: string;
}

export interface Question {
  _id: string;
  title: string;
  friendlyUrl: string;
  description?: string;
  ownerType: string;
  ownerId?: string;
  private?: boolean;
  screening?: {
    status: string | number;
  };
  editDate?: Date;
  createDate?: Date;
  editorId?: string;
  editorUsername?: string;
}

export interface Answer {
  _id: string;
  title: string;
  description?: string;
  questionId?: string;
  private?: boolean;
  screening?: {
    status: string | number;
  };
  editDate?: Date;
  createDate?: Date;
  editorId?: string;
  editorUsername?: string;
}

export interface Issue {
  _id: string;
  title: string;
  description?: string;
  ownerType: string;
  ownerId?: string;
  private?: boolean;
  screening?: {
    status: string | number;
  };
  editDate?: Date;
  createDate?: Date;
  editorId?: string;
  editorUsername?: string;
  resolution?: {
    status?: 'open' | 'resolved' | 'dismissed';
    reason?: string;
    decisionDate?: Date | string;
    decisionUsername?: string;
  };
}

export interface Opinion {
  _id: string;
  title: string;
  description?: string;
  ownerType: string;
  ownerId?: string;
  private?: boolean;
  screening?: {
    status: string | number;
  };
  editDate?: Date;
  createDate?: Date;
  editorId?: string;
  editorUsername?: string;
  discussionContext?: {
    revisionId?: string;
    revisionNumber?: number;
    status?: 'current' | 'potentially_obsolete' | 'relevant' | 'obsolete';
    supersededByRevisionId?: string;
    supersededByRevisionNumber?: number;
    reason?: string;
    flaggedDate?: Date | string;
    reviewedDate?: Date | string;
  };
}

export interface Artifact {
  _id: string;
  title: string;
  friendlyUrl?: string;
  description?: string;
  ownerType: string;
  ownerId?: string;
  private?: boolean;
  screening?: {
    status: string | number;
  };
  editDate?: Date;
  createDate?: Date;
  editorId?: string;
  editorUsername?: string;
  artifactType?: 'document' | 'image' | 'audio' | 'video' | 'dataset' | 'web_capture' | 'physical_record' | 'testimony' | 'other';
  provenance?: {
    originType?: 'primary' | 'secondary' | 'derived' | 'unknown';
    creator?: string;
    publisher?: string;
    publicationDate?: Date | string;
    captureDate?: Date | string;
    archiveUrl?: string;
    checksum?: string;
    accessLimitations?: string;
    verifiabilityNotes?: string;
    sourceQuality?: {
      identity?: number;
      proximity?: number;
      integrity?: number;
      recency?: number;
      reproducibility?: number;
      total?: number;
      notes?: string;
      reviewDate?: Date | string;
      reviewUsername?: string;
    };
  };
}

export interface Group {
  _id: string;
  title: string;
  friendlyUrl?: string;
  description?: string;
  privacyType?: string;
  members?: Array<{
    userId: string;
    role?: string;
  }>;
  createDate?: Date;
  createUserId?: string;
}
