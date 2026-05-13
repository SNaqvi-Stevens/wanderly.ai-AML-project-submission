import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { ChatProvider } from '@/lib/ChatContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import GlobalChat from '@/components/wanderly/GlobalChat';
import Landing from './pages/Landing';
import Onboarding from './pages/Onboarding';
import Results from './pages/Results';
import TripDetail from './pages/TripDetail';
import SavedTrips from './pages/SavedTrips';
import MyTrips from './pages/MyTrips';
import Profile from './pages/Profile';

import BrowseAndBudget from './pages/BrowseAndBudget';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // public routes — render without auth
      const publicRoutes = ['/browse', '/onboarding', '/plan'];
      if (publicRoutes.includes(window.location.pathname)) {
        return (
          <Routes>
            <Route path="/browse" element={<BrowseAndBudget />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/plan" element={<Onboarding />} />
            <Route path="*" element={<Landing />} />
          </Routes>
        );
      }
      return <Landing />;
    }
  }

  // Render the main app
  return (
    <>
      <GlobalChat />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/plan" element={<Onboarding />} />
        <Route path="/browse" element={<BrowseAndBudget />} />
        <Route path="/results" element={<Results />} />
        <Route path="/trip/:destinationName" element={<TripDetail />} />
        <Route path="/saved" element={<Navigate to="/my-trips" replace />} />
        <Route path="/my-trips" element={<MyTrips />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </>
  );
};


function App() {

  return (
    <AuthProvider>
      <ChatProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </QueryClientProvider>
      </ChatProvider>
    </AuthProvider>
  )
}

export default App