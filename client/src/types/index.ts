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
  preferences?: {
    privateProfile?: boolean;
  };
  createdDate?: Date;
  isActive?: string;
}

export interface Application {
  _id: string;
  name: string;
  aboutUrl?: string;
  exploreTopicId?: string;
  resPath?: string;
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
    status: string;
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
    status: string;
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
    status: string;
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
    status: string;
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
    status: string;
  };
  editDate?: Date;
  createDate?: Date;
  editorId?: string;
  editorUsername?: string;
}

export interface Opinion {
  _id: string;
  title: string;
  description?: string;
  ownerType: string;
  ownerId?: string;
  private?: boolean;
  screening?: {
    status: string;
  };
  editDate?: Date;
  createDate?: Date;
  editorId?: string;
  editorUsername?: string;
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
    status: string;
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
