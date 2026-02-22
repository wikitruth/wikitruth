import React from 'react';
import AboutPage from '../pages/AboutPage';
import AccountPage from '../pages/Account/AccountPage';
import SettingsPage from '../pages/Account/SettingsPage';
import VerificationPage from '../pages/Account/VerificationPage';
import AdminDashboard from '../pages/Admin/AdminDashboard';
import AccountsList from '../pages/Admin/Accounts/AccountsList';
import AccountDetails from '../pages/Admin/Accounts/AccountDetails';
import AdminDetails from '../pages/Admin/Administrators/AdminDetails';
import AdminsList from '../pages/Admin/Administrators/AdminsList';
import GroupsList from '../pages/Admin/AdminGroups/GroupsList';
import GroupDetails from '../pages/Admin/AdminGroups/GroupDetails';
import CategoriesList from '../pages/Admin/Categories/CategoriesList';
import CategoryDetails from '../pages/Admin/Categories/CategoryDetails';
import StatusesList from '../pages/Admin/Statuses/StatusesList';
import StatusDetails from '../pages/Admin/Statuses/StatusDetails';
import UserDetails from '../pages/Admin/Users/UserDetails';
import UsersList from '../pages/Admin/Users/UsersList';
import AnswersPage from '../pages/AnswersPage';
import ArgumentCreatePage from '../pages/ArgumentCreatePage';
import ArgumentEntryPage from '../pages/ArgumentEntryPage';
import ArgumentsPage from '../pages/ArgumentsPage';
import ArtifactsPage from '../pages/ArtifactsPage';
import AdministratorsPage from '../pages/Members/AdministratorsPage';
import ContributorsPage from '../pages/Members/ContributorsPage';
import ForgotPasswordPage from '../pages/Auth/ForgotPasswordPage';
import GroupCreate from '../pages/Groups/GroupCreate';
import GroupMembers from '../pages/Groups/Group/GroupMembers';
import GroupPage from '../pages/Groups/Group/GroupPage';
import GroupPosts from '../pages/Groups/Group/GroupPosts';
import GroupsIndex from '../pages/Groups/GroupsIndex';
import GroupsPage from '../pages/GroupsPage';
import HomePage from '../pages/HomePage';
import IssueEntryPage from '../pages/IssueEntryPage';
import IssuesPage from '../pages/IssuesPage';
import LoginPage from '../pages/Auth/LoginPage';
import LogoutPage from '../pages/Auth/LogoutPage';
import MembersPage from '../pages/MembersPage';
import NotFoundPage from '../pages/NotFoundPage';
import OpinionEntryPage from '../pages/OpinionEntryPage';
import OpinionsPage from '../pages/OpinionsPage';
import PageCreate from '../pages/Members/Profile/Pages/PageCreate';
import PagesIndex from '../pages/Members/Profile/Pages/PagesIndex';
import PageView from '../pages/Members/Profile/Pages/PageView';
import ProfileContributions from '../pages/Members/Profile/ProfileContributions';
import ProfileFollowing from '../pages/Members/Profile/ProfileFollowing';
import ProfilePage from '../pages/Members/Profile/ProfilePage';
import ProfileSettings from '../pages/Members/Profile/ProfileSettings';
import ProfileTopics from '../pages/Members/Profile/ProfileTopics';
import QuestionEntryPage from '../pages/QuestionEntryPage';
import QuestionsPage from '../pages/QuestionsPage';
import ResetPasswordPage from '../pages/Auth/ResetPasswordPage';
import ReviewersPage from '../pages/Members/ReviewersPage';
import ScreenersPage from '../pages/Members/ScreenersPage';
import SearchPage from '../pages/SearchPage';
import SignupPage from '../pages/Auth/SignupPage';
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
  { path: '/signup', element: <SignupPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/reset-password', element: <ResetPasswordPage /> },
  { path: '/logout', element: <LogoutPage /> },
  { path: '/account', element: <AccountPage /> },
  { path: '/account/settings', element: <SettingsPage /> },
  { path: '/account/verification', element: <VerificationPage /> },
  { path: '/admin', element: <AdminDashboard /> },
  { path: '/admin/users', element: <UsersList /> },
  { path: '/admin/users/:id', element: <UserDetails /> },
  { path: '/admin/accounts', element: <AccountsList /> },
  { path: '/admin/accounts/:id', element: <AccountDetails /> },
  { path: '/admin/administrators', element: <AdminsList /> },
  { path: '/admin/administrators/:id', element: <AdminDetails /> },
  { path: '/admin/groups', element: <GroupsList /> },
  { path: '/admin/groups/:id', element: <GroupDetails /> },
  { path: '/admin/categories', element: <CategoriesList /> },
  { path: '/admin/categories/:id', element: <CategoryDetails /> },
  { path: '/admin/statuses', element: <StatusesList /> },
  { path: '/admin/statuses/:id', element: <StatusDetails /> },
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
  { path: '/groups/index', element: <GroupsIndex /> },
  { path: '/groups/create', element: <GroupCreate /> },
  { path: '/groups/:id', element: <GroupPage /> },
  { path: '/groups/:id/posts', element: <GroupPosts /> },
  { path: '/groups/:id/members', element: <GroupMembers /> },
  { path: '/members', element: <MembersPage /> },
  { path: '/members/contributors', element: <ContributorsPage /> },
  { path: '/members/screeners', element: <ScreenersPage /> },
  { path: '/members/reviewers', element: <ReviewersPage /> },
  { path: '/members/administrators', element: <AdministratorsPage /> },
  { path: '/members/profile', element: <ProfilePage /> },
  { path: '/members/profile/settings', element: <ProfileSettings /> },
  { path: '/members/profile/topics', element: <ProfileTopics /> },
  { path: '/members/profile/contributions', element: <ProfileContributions /> },
  { path: '/members/profile/following', element: <ProfileFollowing /> },
  { path: '/members/profile/pages', element: <PagesIndex /> },
  { path: '/members/profile/pages/create', element: <PageCreate /> },
  { path: '/members/profile/pages/:id', element: <PageView /> },
  { path: '/search', element: <SearchPage /> },
  { path: '/visualize', element: <VisualizePage /> },
  { path: '/about', element: <AboutPage /> },
  { path: '*', element: <NotFoundPage /> },
];
