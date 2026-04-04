import React, { Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";

// Pages
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ForYouPage from "./pages/ForYouPage";
import ScholarshipsPage from "./pages/ScholarshipsPage";

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
      </Routes>
    </Suspense>
  );
}

export default App;
