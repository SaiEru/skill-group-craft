import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import Whiteboard from "./Whiteboard";

export default function WhiteboardPage() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  return (
    <AppLayout>
      <Whiteboard />
    </AppLayout>
  );
}
