import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { RequireAuth } from '@/components/ui/RoleGuard';
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { BrowseCampaignsPage } from '@/pages/campaigns/BrowseCampaignsPage';
import { CampaignDetailPage } from '@/pages/campaigns/CampaignDetailPage';
import { MyPledgesPage } from '@/pages/backer/MyPledgesPage';
import { CreatorCampaignsPage } from '@/pages/creator/CreatorCampaignsPage';
import { CampaignEditorPage } from '@/pages/creator/CampaignEditorPage';
import { NewPredictionPage } from '@/pages/creator/NewPredictionPage';
import { PredictionHistoryPage } from '@/pages/creator/PredictionHistoryPage';
import { PredictionResultPage } from '@/pages/creator/PredictionResultPage';
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage';
import { AdminDatasetsPage } from '@/pages/admin/AdminDatasetsPage';
import { AdminModelsPage } from '@/pages/admin/AdminModelsPage';
import { AdminTrainPage } from '@/pages/admin/AdminTrainPage';
import { AdminUsersPage } from '@/pages/admin/AdminUsersPage';
import { AccessDeniedPage } from '@/pages/misc/AccessDeniedPage';
import { NotFoundPage } from '@/pages/misc/NotFoundPage';

const CREATOR_ROLES = ['creator', 'admin'] as const;

export function App() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route path="/" element={<AppLayout />}>
        <Route index element={<Navigate to="/campaigns" replace />} />
        <Route path="campaigns" element={<BrowseCampaignsPage />} />
        <Route path="campaigns/:campaignId" element={<CampaignDetailPage />} />

        <Route
          path="my-pledges"
          element={
            <RequireAuth roles={['backer']}>
              <MyPledgesPage />
            </RequireAuth>
          }
        />

        <Route path="creator" element={<Navigate to="/creator/campaigns" replace />} />
        <Route
          path="creator/campaigns"
          element={
            <RequireAuth roles={[...CREATOR_ROLES]}>
              <CreatorCampaignsPage />
            </RequireAuth>
          }
        />
        <Route
          path="creator/campaigns/new"
          element={
            <RequireAuth roles={[...CREATOR_ROLES]}>
              <CampaignEditorPage mode="create" />
            </RequireAuth>
          }
        />
        <Route
          path="creator/campaigns/:campaignId/edit"
          element={
            <RequireAuth roles={[...CREATOR_ROLES]}>
              <CampaignEditorPage mode="edit" />
            </RequireAuth>
          }
        />
        <Route
          path="creator/predictions/new"
          element={
            <RequireAuth roles={[...CREATOR_ROLES]}>
              <NewPredictionPage />
            </RequireAuth>
          }
        />
        <Route
          path="creator/predictions"
          element={
            <RequireAuth roles={[...CREATOR_ROLES]}>
              <PredictionHistoryPage />
            </RequireAuth>
          }
        />
        <Route
          path="creator/predictions/:predictionId"
          element={
            <RequireAuth roles={[...CREATOR_ROLES]}>
              <PredictionResultPage />
            </RequireAuth>
          }
        />

        <Route
          path="admin"
          element={
            <RequireAuth roles={['admin']}>
              <AdminDashboardPage />
            </RequireAuth>
          }
        />
        <Route
          path="admin/datasets"
          element={
            <RequireAuth roles={['admin']}>
              <AdminDatasetsPage />
            </RequireAuth>
          }
        />
        <Route
          path="admin/models"
          element={
            <RequireAuth roles={['admin']}>
              <AdminModelsPage />
            </RequireAuth>
          }
        />
        <Route
          path="admin/models/train"
          element={
            <RequireAuth roles={['admin']}>
              <AdminTrainPage />
            </RequireAuth>
          }
        />
        <Route
          path="admin/users"
          element={
            <RequireAuth roles={['admin']}>
              <AdminUsersPage />
            </RequireAuth>
          }
        />

        <Route path="access-denied" element={<AccessDeniedPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
