import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import GroupDetail from "./GroupDetail";

export default function GroupDetailPage() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  return (
    <AppLayout>
      <GroupDetail />
    </AppLayout>
  );
}
