import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./store/authStore";
import LoginPage from "./features/auth/LoginPage";
import RegisterPage from "./features/auth/RegisterPage";
import DashboardLayout from "./components/layout/DashboardLayout";
import DashboardPage from "./features/dashboard/DashboardPage";
import InboxPage from "./features/inbox/InboxPage";
import GroupsPage from "./features/groups/GroupsPage";
import SettingsPage from "./features/settings/SettingsPage";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Routes>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/inbox" element={<InboxPage />} />
                  <Route path="/inbox/:jid" element={<InboxPage />} />
                  <Route path="/groups" element={<GroupsPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Routes>
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
