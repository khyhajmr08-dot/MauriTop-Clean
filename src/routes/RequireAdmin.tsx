import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../lib/useAuth";
import LoadingSpinner from "../components/LoadingSpinner";

export default function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, isAdmin } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  if (!user) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
