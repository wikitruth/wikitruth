'use strict';

import mongoose from 'mongoose';
import { z } from 'zod';

import {
  CIVIC_RECORD_KINDS,
  CIVIC_RECORD_STAGES,
  CIVIC_RECORD_STATUSES,
  CIVIC_SEVERITIES,
} from '../../types/civic';

const optionalDate = z.union([z.string().trim().min(1), z.date(), z.null()]).optional();
const optionalId = z.string().trim().refine(
  (value) => !value || mongoose.isValidObjectId(value),
  'Must be a valid record id',
).optional();
const optionalIdArray = z.array(z.string().trim().refine((value) => mongoose.isValidObjectId(value), 'Invalid id')).max(50).optional();

export const civicRecordInput = z.object({
  kind: z.enum(CIVIC_RECORD_KINDS),
  title: z.string().trim().min(3).max(180),
  summary: z.string().trim().max(500).optional().default(''),
  description: z.string().trim().max(30000).optional().default(''),
  severity: z.enum(CIVIC_SEVERITIES).optional().default('info'),
  jurisdictionId: optionalId,
  parentId: optionalId,
  relatedRecordIds: optionalIdArray,
  artifactIds: optionalIdArray,
  issueIds: optionalIdArray,
  location: z.object({
    countryCode: z.string().trim().length(2).optional(),
    region: z.string().trim().max(120).optional(),
    province: z.string().trim().max(120).optional(),
    city: z.string().trim().max(120).optional(),
    barangay: z.string().trim().max(120).optional(),
    address: z.string().trim().max(300).optional(),
    coordinates: z.object({
      latitude: z.number().min(-90).max(90).nullable().optional(),
      longitude: z.number().min(-180).max(180).nullable().optional(),
    }).optional(),
  }).optional(),
  responsibility: z.object({
    institutionId: optionalId,
    officeId: optionalId,
    personId: optionalId,
    role: z.string().trim().max(180).optional(),
    startDate: optionalDate,
    endDate: optionalDate,
  }).optional(),
  project: z.object({
    budget: z.number().min(0).nullable().optional(),
    currency: z.string().trim().length(3).optional(),
    contractor: z.string().trim().max(240).optional(),
    contractReference: z.string().trim().max(240).optional(),
    progressPercent: z.number().min(0).max(100).nullable().optional(),
    startDate: optionalDate,
    targetEndDate: optionalDate,
    actualEndDate: optionalDate,
  }).optional(),
  observation: z.object({
    observedAt: optionalDate,
    sourceUrl: z.string().trim().url().or(z.literal('')).optional(),
    escalationStatus: z.enum(['submitted', 'screening', 'accepted', 'escalated', 'addressed', 'rejected']).optional(),
  }).optional(),
  election: z.object({
    position: z.string().trim().max(180).optional(),
    electionDate: optionalDate,
    jurisdiction: z.string().trim().max(180).optional(),
    platform: z.string().trim().max(5000).optional(),
  }).optional(),
  outcome: z.object({
    summary: z.string().trim().max(5000).optional(),
    happenedAt: optionalDate,
  }).optional(),
  private: z.boolean().optional().default(false),
});

export const civicRecordUpdate = civicRecordInput.partial().omit({ kind: true });

export const civicTransitionInput = z.object({
  status: z.enum(CIVIC_RECORD_STATUSES).optional(),
  stage: z.enum(CIVIC_RECORD_STAGES).optional(),
  reason: z.string().trim().min(10).max(2000),
  outcome: z.object({
    summary: z.string().trim().max(5000).optional(),
    happenedAt: optionalDate,
  }).optional(),
}).refine((value) => Boolean(value.status || value.stage || value.outcome), {
  message: 'A status, stage, or outcome change is required',
});
