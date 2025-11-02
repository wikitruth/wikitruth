import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import TopicsPage from './pages/TopicsPage';
import TopicEntryPage from './pages/TopicEntryPage';
import TopicCreatePage from './pages/TopicCreatePage';
import ArgumentsPage from './pages/ArgumentsPage';
import ArgumentEntryPage from './pages/ArgumentEntryPage';
import ArgumentCreatePage from './pages/ArgumentCreatePage';
import QuestionsPage from './pages/QuestionsPage';
import QuestionEntryPage from './pages/QuestionEntryPage';
import IssuesPage from './pages/IssuesPage';
import IssueEntryPage from './pages/IssueEntryPage';
import OpinionsPage from './pages/OpinionsPage';
import OpinionEntryPage from './pages/OpinionEntryPage';
import AnswersPage from './pages/AnswersPage';
import ArtifactsPage from './pages/ArtifactsPage';
import GroupsPage from './pages/GroupsPage';
import MembersPage from './pages/MembersPage';
import SearchPage from './pages/SearchPage';
import VisualizePage from './pages/VisualizePage';
import AboutPage from './pages/AboutPage';
import LoginPage from './pages/LoginPage';
import NotFoundPage from './pages/NotFoundPage';
import Layout from './components/Layout/Layout';

const App: React.FC = () => {
  return (
    <Router basename="/app">
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/topics" element={<TopicsPage />} />
          <Route path="/topics/create" element={<TopicCreatePage />} />
          <Route path="/topics/entry/:friendlyUrl/:id" element={<TopicEntryPage />} />
          <Route path="/topics/:friendlyUrl/:id" element={<TopicsPage />} />
          <Route path="/arguments" element={<ArgumentsPage />} />
          <Route path="/arguments/create" element={<ArgumentCreatePage />} />
          <Route path="/arguments/entry/:friendlyUrl/:id" element={<ArgumentEntryPage />} />
          <Route path="/questions" element={<QuestionsPage />} />
          <Route path="/questions/entry/:friendlyUrl/:id" element={<QuestionEntryPage />} />
          <Route path="/issues" element={<IssuesPage />} />
          <Route path="/issues/entry/:friendlyUrl/:id" element={<IssueEntryPage />} />
          <Route path="/opinions" element={<OpinionsPage />} />
          <Route path="/opinions/entry/:friendlyUrl/:id" element={<OpinionEntryPage />} />
          <Route path="/answers" element={<AnswersPage />} />
          <Route path="/artifacts" element={<ArtifactsPage />} />
          <Route path="/groups" element={<GroupsPage />} />
          <Route path="/members" element={<MembersPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/visualize" element={<VisualizePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Layout>
    </Router>
  );
};

export default App;
