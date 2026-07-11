'use strict';

import type { Router } from 'express';

import type { WikitruthRequest, WikitruthResponse } from '../../types/http';
import { logEntryEvent } from '../../services/entryEventsService';
import constants from '../../models/constants';
import {
  db,
  getDefaultActiveRole,
  getSessionActiveRole,
  sanitizeUser,
  setSessionActiveRole,
  type AuthUserDocument,
} from './authHelpers';

type OnboardingTrack = 'contributor' | 'reviewer';
type TrackState = {
  completed: boolean;
  policyVersion: string;
  acknowledgements: string[];
  completedDate: Date;
  completedUserId: unknown;
};
type OnboardingUser = AuthUserDocument & {
  onboarding?: Partial<Record<OnboardingTrack, Partial<TrackState>>>;
};

export const ONBOARDING_TRACKS = {
  contributor: {
    policyVersion: '2026-07-11',
    title: 'Contributor Foundations',
    acknowledgements: [
      'search_before_creating',
      'separate_fact_and_ethics',
      'record_source_provenance',
      'use_change_requests_for_protected_content',
    ],
  },
  reviewer: {
    policyVersion: '2026-07-11',
    title: 'Reviewer Responsibilities',
    acknowledgements: [
      'apply_source_quality_rubric',
      'keep_verdict_channels_independent',
      'record_reasoned_privileged_decisions',
      'escalate_conflicts_and_integrity_failures',
    ],
  },
} as const;

function parseTrack(value: unknown): OnboardingTrack | null {
  const track = String(value || '').trim().toLowerCase();
  return track === 'contributor' || track === 'reviewer' ? track : null;
}

function trackComplete(user: OnboardingUser, track: OnboardingTrack): boolean {
  return user.onboarding?.[track]?.completed !== false;
}

function publicTracks(user: OnboardingUser) {
  return Object.entries(ONBOARDING_TRACKS).map(([key, config]) => ({
    key,
    ...config,
    eligible: key === 'contributor' || Boolean(user.roles?.reviewer || user.roles?.admin),
    completed: trackComplete(user, key as OnboardingTrack),
    completedDate: user.onboarding?.[key as OnboardingTrack]?.completedDate || null,
    completedPolicyVersion: user.onboarding?.[key as OnboardingTrack]?.policyVersion || '',
  }));
}

export function registerAuthOnboardingRoutes(router: Router): void {
  router.get('/onboarding', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }
    const user = await db.User.findById(req.user._id || req.user.id) as OnboardingUser | null;
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    res.json({ success: true, tracks: publicTracks(user) });
  });

  router.post('/onboarding/:track/complete', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }
    const track = parseTrack(req.params.track);
    if (!track) {
      res.status(400).json({ success: false, message: 'Onboarding track must be contributor or reviewer' });
      return;
    }
    const user = await db.User.findById(req.user._id || req.user.id) as OnboardingUser | null;
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    if (track === 'reviewer' && !user.roles?.reviewer && !user.roles?.admin) {
      res.status(403).json({ success: false, message: 'Reviewer onboarding requires an assigned reviewer role' });
      return;
    }
    const required = [...ONBOARDING_TRACKS[track].acknowledgements];
    const received = Array.isArray(req.body?.acknowledgements)
      ? new Set(req.body.acknowledgements.map((value: unknown) => String(value || '').trim()))
      : new Set<string>();
    if (!required.every((item) => received.has(item)) || req.body?.confirmation !== true) {
      res.status(400).json({
        success: false,
        message: 'All policy responsibilities and the completion confirmation are required',
      });
      return;
    }
    const now = new Date();
    user.onboarding = user.onboarding || {};
    user.onboarding[track] = {
      ...(user.onboarding[track] || {}),
      completed: true,
      policyVersion: ONBOARDING_TRACKS[track].policyVersion,
      acknowledgements: required,
      completedDate: now,
      completedUserId: user._id,
    };
    await user.save();
    let activeRole = getSessionActiveRole(req);
    if (!activeRole || (track === 'contributor' && activeRole === 'reader')) {
      activeRole = getDefaultActiveRole(user);
      setSessionActiveRole(req, activeRole);
    }
    await logEntryEvent({
      eventType: `onboarding.${track}.completed`,
      objectType: constants.OBJECT_TYPES.user,
      objectName: 'user',
      objectId: String(user._id),
      actorUserId: String(user._id),
      actorUsername: String(user.username || ''),
      message: `${ONBOARDING_TRACKS[track].title} completed`,
      payload: { track, policyVersion: ONBOARDING_TRACKS[track].policyVersion, acknowledgements: required },
    });
    res.json({
      success: true,
      user: sanitizeUser(user),
      activeRole,
      tracks: publicTracks(user),
    });
  });
}
