import React from "react";
import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ForYouPage from "./pages/ForYouPage";

function App() {
  return (
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
    </Routes>
  );
}

export default App;
