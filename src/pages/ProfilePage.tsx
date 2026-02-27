import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import Profile from "@/pages/Profile";

export default function ProfilePage() {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center bg-background"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  if (!user) return <Navigate to="/auth" replace />;
  return <AppLayout><Profile /></AppLayout>;
}
