import { Document, Types, Schema } from 'mongoose';

export interface IScreeningHistory {
    userId: Types.ObjectId;
    date: Date;
    status: number;
}

export interface IChildrenCount {
    total: number;
    accepted: number;
    pending: number;
    rejected: number;
    acceptedCritical?: number;
}

export interface IVerdict {
    status: number;
    editDate: Date;
    editUserId: Types.ObjectId;
}

export interface IEthicalStatus {
    hasValue: boolean;
    status?: number;
}

export interface IBaseDocument extends Document {
    _id: Types.ObjectId;
    title: string;
    content: string;
    references: string;
    friendlyUrl?: string;
    contentPreview?: string;
    screening: {
        status: number;
        history: Array<{
            userId: Types.ObjectId;
            date: Date;
            status: number;
        }>;
    };
    groupId: Types.ObjectId | null;
    categoryId: Types.ObjectId;
    ownerId: Types.ObjectId;
    ownerType: number;
    createDate: Date;
    createUserId: Types.ObjectId;
    editDate: Date;
    editUserId: Types.ObjectId;
    private: boolean;
    ethicalStatus: IEthicalStatus;
    verdict?: IVerdict;
    extras: Record<string, unknown>;
    getType(): number;
}

export interface IFile {
    name: string;
    type: string;
    size: number;
    lastModifiedDate: Date;
}

export interface IGroupMember {
    userId: Types.ObjectId;
    roleType: number;
}

export interface IApp {
    db: {
        model: (name: string, schema: Schema) => void;
    };
    get?: (key: string) => string | undefined;
} 