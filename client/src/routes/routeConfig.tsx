import React, { lazy } from 'react';

const HomePage = lazy(() => import('../pages/HomePage'));
const LoginPage = lazy(() => import('../pages/Auth/LoginPage'));
const SignupPage = lazy(() => import('../pages/Auth/SignupPage'));
const ForgotPasswordPage = lazy(() => import('../pages/Auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('../pages/Auth/ResetPasswordPage'));
const LogoutPage = lazy(() => import('../pages/Auth/LogoutPage'));
const AccountPage = lazy(() => import('../pages/Account/AccountPage'));
const SettingsPage = lazy(() => import('../pages/Account/SettingsPage'));
const VerificationPage = lazy(() => import('../pages/Account/VerificationPage'));
const AdminDashboard = lazy(() => import('../pages/Admin/AdminDashboard'));
const UsersList = lazy(() => import('../pages/Admin/Users/UsersList'));
const UserDetails = lazy(() => import('../pages/Admin/Users/UserDetails'));
const AccountsList = lazy(() => import('../pages/Admin/Accounts/AccountsList'));
const AccountDetails = lazy(() => import('../pages/Admin/Accounts/AccountDetails'));
const AdminsList = lazy(() => import('../pages/Admin/Administrators/AdminsList'));
const AdminDetails = lazy(() => import('../pages/Admin/Administrators/AdminDetails'));
const GroupsList = lazy(() => import('../pages/Admin/AdminGroups/GroupsList'));
const GroupDetails = lazy(() => import('../pages/Admin/AdminGroups/GroupDetails'));
const CategoriesList = lazy(() => import('../pages/Admin/Categories/CategoriesList'));
const CategoryDetails = lazy(() => import('../pages/Admin/Categories/CategoryDetails'));
const StatusesList = lazy(() => import('../pages/Admin/Statuses/StatusesList'));
const StatusDetails = lazy(() => import('../pages/Admin/Statuses/StatusDetails'));
const DBBackupPage = lazy(() => import('../pages/Admin/DBBackup/DBBackupPage'));
const TopicsPage = lazy(() => import('../pages/TopicsPage'));
const TopicCreatePage = lazy(() => import('../pages/TopicCreatePage'));
const TopicEntryPage = lazy(() => import('../pages/TopicEntryPage'));
const ArgumentsPage = lazy(() => import('../pages/ArgumentsPage'));
const ArgumentCreatePage = lazy(() => import('../pages/ArgumentCreatePage'));
const ArgumentEntryPage = lazy(() => import('../pages/ArgumentEntryPage'));
const QuestionsPage = lazy(() => import('../pages/QuestionsPage'));
const QuestionCreatePage = lazy(() => import('../pages/QuestionCreatePage'));
const QuestionEditPage = lazy(() => import('../pages/QuestionEditPage'));
const QuestionEntryPage = lazy(() => import('../pages/QuestionEntryPage'));
const IssuesPage = lazy(() => import('../pages/IssuesPage'));
const IssueCreatePage = lazy(() => import('../pages/IssueCreatePage'));
const IssueEditPage = lazy(() => import('../pages/IssueEditPage'));
const IssueEntryPage = lazy(() => import('../pages/IssueEntryPage'));
const OpinionsPage = lazy(() => import('../pages/OpinionsPage'));
const OpinionCreatePage = lazy(() => import('../pages/OpinionCreatePage'));
const OpinionEditPage = lazy(() => import('../pages/OpinionEditPage'));
const OpinionEntryPage = lazy(() => import('../pages/OpinionEntryPage'));
const AnswersPage = lazy(() => import('../pages/AnswersPage'));
const AnswerCreatePage = lazy(() => import('../pages/AnswerCreatePage'));
const AnswerEditPage = lazy(() => import('../pages/AnswerEditPage'));
const AnswerEntryPage = lazy(() => import('../pages/AnswerEntryPage'));
const ArtifactsPage = lazy(() => import('../pages/ArtifactsPage'));
const ArtifactCreatePage = lazy(() => import('../pages/ArtifactCreatePage'));
const ArtifactEditPage = lazy(() => import('../pages/ArtifactEditPage'));
const ArtifactEntryPage = lazy(() => import('../pages/ArtifactEntryPage'));
const GroupsPage = lazy(() => import('../pages/GroupsPage'));
const GroupsIndex = lazy(() => import('../pages/Groups/GroupsIndex'));
const GroupCreate = lazy(() => import('../pages/Groups/GroupCreate'));
const GroupPage = lazy(() => import('../pages/Groups/Group/GroupPage'));
const GroupPosts = lazy(() => import('../pages/Groups/Group/GroupPosts'));
const GroupMembers = lazy(() => import('../pages/Groups/Group/GroupMembers'));
const MembersPage = lazy(() => import('../pages/MembersPage'));
const ContributorsPage = lazy(() => import('../pages/Members/ContributorsPage'));
const ScreenersPage = lazy(() => import('../pages/Members/ScreenersPage'));
const ReviewersPage = lazy(() => import('../pages/Members/ReviewersPage'));
const AdministratorsPage = lazy(() => import('../pages/Members/AdministratorsPage'));
const ProfilePage = lazy(() => import('../pages/Members/Profile/ProfilePage'));
const ProfileSettings = lazy(() => import('../pages/Members/Profile/ProfileSettings'));
const ProfileTopics = lazy(() => import('../pages/Members/Profile/ProfileTopics'));
const ProfileDiary = lazy(() => import('../pages/Members/Profile/ProfileTopics'));
const ProfileContributions = lazy(() => import('../pages/Members/Profile/ProfileContributions'));
const ProfileFollowing = lazy(() => import('../pages/Members/Profile/ProfileFollowing'));
const PagesIndex = lazy(() => import('../pages/Members/Profile/Pages/PagesIndex'));
const PageCreate = lazy(() => import('../pages/Members/Profile/Pages/PageCreate'));
const PageView = lazy(() => import('../pages/Members/Profile/Pages/PageView'));
const SearchPage = lazy(() => import('../pages/SearchPage'));
const VisualizePage = lazy(() => import('../pages/VisualizePage'));
const AboutPage = lazy(() => import('../pages/AboutPage'));
const ContactPage = lazy(() => import('../pages/Contact/ContactPage'));
const HelpUsPage = lazy(() => import('../pages/HelpUs/HelpUsPage'));
const InstallPage = lazy(() => import('../pages/Install/InstallPage'));
const FastSwitchPage = lazy(() => import('../pages/FastSwitch/FastSwitchPage'));
const ServerError500 = lazy(() => import('../pages/Errors/ServerError500'));
const ServiceUnavailable503 = lazy(() => import('../pages/Errors/ServiceUnavailable503'));
const NotFoundPage = lazy(() => import('../pages/NotFoundPage'));

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
  { path: '/admin/db-backup', element: <DBBackupPage /> },
  { path: '/topics', element: <TopicsPage /> },
  { path: '/topics/create', element: <TopicCreatePage /> },
  { path: '/topics/entry/:friendlyUrl/:id', element: <TopicEntryPage /> },
  { path: '/topics/entry/:friendlyUrl/:id/discussion', element: <TopicEntryPage /> },
  { path: '/topics/:friendlyUrl/:id', element: <TopicsPage /> },
  { path: '/arguments', element: <ArgumentsPage /> },
  { path: '/arguments/create', element: <ArgumentCreatePage /> },
  { path: '/arguments/entry/:friendlyUrl/:id', element: <ArgumentEntryPage /> },
  { path: '/arguments/entry/:friendlyUrl/:id/discussion', element: <ArgumentEntryPage /> },
  { path: '/questions', element: <QuestionsPage /> },
  { path: '/questions/create', element: <QuestionCreatePage /> },
  { path: '/questions/edit/:id', element: <QuestionEditPage /> },
  { path: '/questions/entry/:friendlyUrl/:id', element: <QuestionEntryPage /> },
  { path: '/questions/entry/:friendlyUrl/:id/answers', element: <QuestionEntryPage /> },
  { path: '/questions/entry/:friendlyUrl/:id/discussion', element: <QuestionEntryPage /> },
  { path: '/questions/entry/:id', element: <QuestionEntryPage /> },
  { path: '/issues', element: <IssuesPage /> },
  { path: '/issues/create', element: <IssueCreatePage /> },
  { path: '/issues/edit/:id', element: <IssueEditPage /> },
  { path: '/issues/entry/:friendlyUrl/:id', element: <IssueEntryPage /> },
  { path: '/issues/entry/:friendlyUrl/:id/discussion', element: <IssueEntryPage /> },
  { path: '/issues/entry/:id', element: <IssueEntryPage /> },
  { path: '/opinions', element: <OpinionsPage /> },
  { path: '/opinions/create', element: <OpinionCreatePage /> },
  { path: '/opinions/edit/:id', element: <OpinionEditPage /> },
  { path: '/opinions/entry/:friendlyUrl/:id', element: <OpinionEntryPage /> },
  { path: '/opinions/entry/:friendlyUrl/:id/discussion', element: <OpinionEntryPage /> },
  { path: '/opinions/entry/:id', element: <OpinionEntryPage /> },
  { path: '/answers', element: <AnswersPage /> },
  { path: '/answers/create', element: <AnswerCreatePage /> },
  { path: '/answers/edit/:id', element: <AnswerEditPage /> },
  { path: '/answers/entry/:id', element: <AnswerEntryPage /> },
  { path: '/artifacts', element: <ArtifactsPage /> },
  { path: '/artifacts/create', element: <ArtifactCreatePage /> },
  { path: '/artifacts/edit/:id', element: <ArtifactEditPage /> },
  { path: '/artifacts/entry/:friendlyUrl/:id', element: <ArtifactEntryPage /> },
  { path: '/artifacts/entry/:id', element: <ArtifactEntryPage /> },
  { path: '/groups', element: <GroupsPage /> },
  { path: '/groups/index', element: <GroupsIndex /> },
  { path: '/groups/create', element: <GroupCreate /> },
  { path: '/groups/:friendlyUrl/:id', element: <GroupPage /> },
  { path: '/groups/:friendlyUrl/:id/posts', element: <GroupPosts /> },
  { path: '/groups/:friendlyUrl/:id/members', element: <GroupMembers /> },
  { path: '/groups/:id', element: <GroupPage /> },
  { path: '/groups/:id/posts', element: <GroupPosts /> },
  { path: '/groups/:id/members', element: <GroupMembers /> },
  { path: '/members', element: <MembersPage /> },
  { path: '/members/contributors', element: <ContributorsPage /> },
  { path: '/members/screeners', element: <ScreenersPage /> },
  { path: '/members/reviewers', element: <ReviewersPage /> },
  { path: '/members/administrators', element: <AdministratorsPage /> },
  { path: '/members/:username', element: <ProfilePage /> },
  { path: '/members/profile', element: <ProfilePage /> },
  { path: '/members/profile/settings', element: <ProfileSettings /> },
  { path: '/members/:username/topics', element: <ProfileTopics /> },
  { path: '/members/profile/topics', element: <ProfileTopics /> },
  { path: '/members/:username/diary', element: <ProfileDiary /> },
  { path: '/members/profile/diary', element: <ProfileDiary /> },
  { path: '/members/:username/contributions', element: <ProfileContributions /> },
  { path: '/members/profile/contributions', element: <ProfileContributions /> },
  { path: '/members/:username/following', element: <ProfileFollowing /> },
  { path: '/members/profile/following', element: <ProfileFollowing /> },
  { path: '/members/profile/pages', element: <PagesIndex /> },
  { path: '/members/profile/pages/create', element: <PageCreate /> },
  { path: '/members/:username/pages/:id', element: <PageView /> },
  { path: '/members/profile/pages/:id', element: <PageView /> },
  { path: '/search', element: <SearchPage /> },
  { path: '/visualize', element: <VisualizePage /> },
  { path: '/about', element: <AboutPage /> },
  { path: '/contact', element: <ContactPage /> },
  { path: '/help-us', element: <HelpUsPage /> },
  { path: '/install', element: <InstallPage /> },
  { path: '/fast-switch', element: <FastSwitchPage /> },
  { path: '/500', element: <ServerError500 /> },
  { path: '/503', element: <ServiceUnavailable503 /> },
  { path: '*', element: <NotFoundPage /> },
];
