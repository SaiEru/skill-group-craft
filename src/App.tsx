import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import GenerateGroupsPage from "./pages/GenerateGroupsPage";
import ProfilePage from "./pages/ProfilePage";
import UsersPage from "./pages/UsersPage";
import RequestsPage from "./pages/RequestsPage";
import ChatPage from "./pages/ChatPage";
import ChatRoomPage from "./pages/ChatRoomPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/generate" element={<GenerateGroupsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/requests" element={<RequestsPage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/chat/:userId" element={<ChatRoomPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
