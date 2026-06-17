import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { RequireAuth } from "@/components/RequireAuth";

// Public pages
const Home = lazy(() => import("./pages/Home"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Features = lazy(() => import("./pages/Features"));
const PublicMarkets = lazy(() => import("./pages/PublicMarkets"));
const Security = lazy(() => import("./pages/Security"));
const HowItWorks = lazy(() => import("./pages/HowItWorks"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));

// User app
const UserLayout = lazy(() => import("./layouts/UserLayout"));
const Dashboard = lazy(() => import("./pages/user/Dashboard"));
const Deposit = lazy(() => import("./pages/user/Deposit"));
const Withdraw = lazy(() => import("./pages/user/Withdraw"));
const WalletPage = lazy(() => import("./pages/user/WalletPage"));
const Markets = lazy(() => import("./pages/user/Markets"));
const Stake = lazy(() => import("./pages/user/Stake"));
const Settings = lazy(() => import("./pages/user/Settings"));
const Profile = lazy(() => import("./pages/user/Profile"));
const Exchange = lazy(() => import("./pages/user/Exchange"));
const Mining = lazy(() => import("./pages/user/Mining"));

// Admin app
const AdminLayout = lazy(() => import("./layouts/AdminLayout"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminDeposits = lazy(() => import("./pages/admin/AdminDeposits"));
const AdminWithdrawals = lazy(() => import("./pages/admin/AdminWithdrawals"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminUserDetail = lazy(() => import("./pages/admin/AdminUserDetail"));
const AdminNotifications = lazy(() => import("./pages/admin/AdminNotifications"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminEmailSettings = lazy(() => import("./pages/admin/AdminEmailSettings"));
const AdminAnnouncements = lazy(() => import("./pages/admin/AdminAnnouncements"));
const AdminExchange = lazy(() => import("./pages/admin/AdminExchange"));
const AdminKyc = lazy(() => import("./pages/admin/AdminKyc"));
const AdminBalances = lazy(() => import("./pages/admin/AdminBalances"));
const AdminPlaceholder = lazy(() => import("./pages/admin/AdminPlaceholder"));
const AdminStakingPlans = lazy(() => import("./pages/admin/AdminStakingPlans"));
const AdminMining = lazy(() => import("./pages/admin/AdminMining"));
const AdminReportsTransactions = lazy(() => import("./pages/admin/AdminReportsTransactions"));
const AdminReportsLogins = lazy(() => import("./pages/admin/AdminReportsLogins"));
const AdminReportsNotifications = lazy(() => import("./pages/admin/AdminReportsNotifications"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

// ❌ REMOVED: createStableRouterWindow — this was causing the Illegal invocation crash

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      {/* ✅ Plain BrowserRouter — no custom window prop needed */}
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/admin/login" element={<Login admin />} />
              <Route path="/features" element={<Features />} />
              <Route path="/markets" element={<PublicMarkets />} />
              <Route path="/security" element={<Security />} />
              <Route path="/how-it-works" element={<HowItWorks />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />

              <Route path="/app" element={<RequireAuth><UserLayout /></RequireAuth>}>
                <Route index element={<Dashboard />} />
                <Route path="deposit" element={<Deposit />} />
                <Route path="withdraw" element={<Withdraw />} />
                <Route path="wallet" element={<WalletPage />} />
                <Route path="markets" element={<Markets />} />
                <Route path="stake" element={<Stake />} />
                <Route path="exchange" element={<Exchange />} />
                <Route path="mining" element={<Mining />} />
                <Route path="profile" element={<Profile />} />
                <Route path="settings" element={<Settings />} />
              </Route>

              <Route path="/admin" element={<RequireAuth adminOnly><AdminLayout /></RequireAuth>}>
                <Route index element={<AdminDashboard />} />
                <Route path="deposits" element={<AdminDeposits />} />
                <Route path="withdrawals" element={<Navigate to="/admin/withdrawals/all" replace />} />
                <Route path="withdrawals/:status" element={<AdminWithdrawals />} />
                <Route path="users" element={<Navigate to="/admin/users/all" replace />} />
                <Route path="users/detail/:id" element={<AdminUserDetail />} />
                <Route path="users/:filter" element={<AdminUsers />} />
                <Route path="notifications" element={<AdminNotifications />} />
                <Route path="settings" element={<AdminSettings />} />
                <Route path="settings/email" element={<AdminEmailSettings />} />
                <Route path="announcements" element={<AdminAnnouncements />} />
                <Route path="exchange" element={<AdminExchange />} />
                <Route path="kyc" element={<AdminKyc />} />
                <Route path="balances" element={<AdminBalances />} />
                <Route path="signals/add" element={<AdminPlaceholder title="Add Signal" description="Create and broadcast trade signals." />} />
                <Route path="signals/user" element={<AdminPlaceholder title="User Signals" description="Track signals delivered to users." />} />
                <Route path="staking/plans" element={<AdminStakingPlans />} />
                <Route path="staking/users" element={<AdminPlaceholder title="User Staking" description="View all user stakes." />} />
                <Route path="mining/projects" element={<AdminMining />} />
                <Route path="trades/open" element={<AdminPlaceholder title="Open Trades" description="Active trade records." />} />
                <Route path="trades/complete" element={<AdminPlaceholder title="Complete Trades" description="Closed trade records." />} />
                <Route path="copy-experts" element={<AdminPlaceholder title="Copy Experts" description="Manage expert traders." />} />
                <Route path="reports/transactions" element={<AdminReportsTransactions />} />
                <Route path="reports/logins" element={<AdminReportsLogins />} />
                <Route path="reports/notifications" element={<AdminReportsNotifications />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;