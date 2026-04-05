import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminProtectedRoute from "./admin/AdminProtectedRoute.jsx";
import AdminLayout from "./admin/AdminLayout.jsx";
import AdminOverviewPage from "./admin/pages/AdminOverviewPage.jsx";
import LiveConversationsPage from "./admin/pages/LiveConversationsPage.jsx";
import LeadsMatrixPage from "./admin/pages/LeadsMatrixPage.jsx";
import CallBriefsPage from "./admin/pages/CallBriefsPage.jsx";
import KbGapQueuePage from "./admin/pages/KbGapQueuePage.jsx";
import ManualEntitiesPage from "./admin/pages/ManualEntitiesPage.jsx";
import AdminTriggersPage from "./admin/pages/AdminTriggersPage.jsx";
import AnalyticsPage from "./admin/pages/AnalyticsPage.jsx";
import CalendarPage from "./admin/pages/CalendarPage.jsx";
import NurturePage from "./admin/pages/NurturePage.jsx";

// Pages
const HomePage = lazy(() => import("./pages/HomePage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const SignupPage = lazy(() => import("./pages/SignupPage"));
const ForYouPage = lazy(() => import("./pages/ForYouPage"));
const ScholarshipsPage = lazy(() => import("./pages/ScholarshipsPage"));
const SchedulePage = lazy(() => import("./pages/SchedulePage"));

const SectionLoader = () => (
  <div className="flex h-32 w-full items-center justify-center bg-fateh-paper/50">
    <div className="h-6 w-6 animate-spin rounded-full border-2 border-fateh-gold/20 border-t-fateh-gold" />
  </div>
);

function App() {
  return (
    <Suspense fallback={<SectionLoader />}>
      <Routes>
        <Route
          path="/"
          element={
            <Layout>
              <HomePage />
            </Layout>
          }
        />
        <Route
          path="/login"
          element={
            <Layout>
              <LoginPage />
            </Layout>
          }
        />
        <Route
          path="/signup"
          element={
            <Layout>
              <SignupPage />
            </Layout>
          }
        />
        <Route
          path="/for-you"
          element={
            <Layout>
              <ProtectedRoute>
                <ForYouPage />
              </ProtectedRoute>
            </Layout>
          }
        />
        <Route
          path="/for-you/scholarships"
          element={
            <Layout>
              <ProtectedRoute>
                <ScholarshipsPage />
              </ProtectedRoute>
            </Layout>
          }
        />
        <Route
          path="/for-you/schedule"
          element={
            <Layout>
              <ProtectedRoute>
                <SchedulePage />
              </ProtectedRoute>
            </Layout>
          }
        />

        {/* Legacy URL: same auth as /login */}
        <Route path="/admin/login" element={<Navigate to="/login" replace state={{ from: "/admin/overview" }} />} />
        <Route
          path="/admin"
          element={
            <AdminProtectedRoute>
              <AdminLayout />
            </AdminProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/admin/overview" replace />} />
          <Route path="overview" element={<AdminOverviewPage />} />
          <Route path="live" element={<LiveConversationsPage />} />
          <Route path="leads" element={<LeadsMatrixPage />} />
          <Route path="briefs" element={<CallBriefsPage />} />
          <Route path="kb/gaps" element={<KbGapQueuePage />} />
          <Route path="kb/entities" element={<ManualEntitiesPage />} />
          <Route path="kb/triggers" element={<AdminTriggersPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="nurture" element={<NurturePage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

export default App;
