import React from 'react';
import AboutPage from '../pages/AboutPage';
import AnswersPage from '../pages/AnswersPage';
import ArgumentCreatePage from '../pages/ArgumentCreatePage';
import ArgumentEntryPage from '../pages/ArgumentEntryPage';
import ArgumentsPage from '../pages/ArgumentsPage';
import ArtifactsPage from '../pages/ArtifactsPage';
import GroupsPage from '../pages/GroupsPage';
import HomePage from '../pages/HomePage';
import IssueEntryPage from '../pages/IssueEntryPage';
import IssuesPage from '../pages/IssuesPage';
import LoginPage from '../pages/LoginPage';
import MembersPage from '../pages/MembersPage';
import NotFoundPage from '../pages/NotFoundPage';
import OpinionEntryPage from '../pages/OpinionEntryPage';
import OpinionsPage from '../pages/OpinionsPage';
import QuestionEntryPage from '../pages/QuestionEntryPage';
import QuestionsPage from '../pages/QuestionsPage';
import SearchPage from '../pages/SearchPage';
import TopicCreatePage from '../pages/TopicCreatePage';
import TopicEntryPage from '../pages/TopicEntryPage';
import TopicsPage from '../pages/TopicsPage';
import VisualizePage from '../pages/VisualizePage';

export interface AppRoute {
  path: string;
  element: React.ReactElement;
}

export const appRoutes: AppRoute[] = [
  { path: '/', element: <HomePage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/topics', element: <TopicsPage /> },
  { path: '/topics/create', element: <TopicCreatePage /> },
  { path: '/topics/entry/:friendlyUrl/:id', element: <TopicEntryPage /> },
  { path: '/topics/:friendlyUrl/:id', element: <TopicsPage /> },
  { path: '/arguments', element: <ArgumentsPage /> },
  { path: '/arguments/create', element: <ArgumentCreatePage /> },
  { path: '/arguments/entry/:friendlyUrl/:id', element: <ArgumentEntryPage /> },
  { path: '/questions', element: <QuestionsPage /> },
  { path: '/questions/entry/:friendlyUrl/:id', element: <QuestionEntryPage /> },
  { path: '/issues', element: <IssuesPage /> },
  { path: '/issues/entry/:friendlyUrl/:id', element: <IssueEntryPage /> },
  { path: '/opinions', element: <OpinionsPage /> },
  { path: '/opinions/entry/:friendlyUrl/:id', element: <OpinionEntryPage /> },
  { path: '/answers', element: <AnswersPage /> },
  { path: '/artifacts', element: <ArtifactsPage /> },
  { path: '/groups', element: <GroupsPage /> },
  { path: '/members', element: <MembersPage /> },
  { path: '/search', element: <SearchPage /> },
  { path: '/visualize', element: <VisualizePage /> },
  { path: '/about', element: <AboutPage /> },
  { path: '*', element: <NotFoundPage /> },
];
