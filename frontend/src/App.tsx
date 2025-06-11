import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { WalletProvider } from '@/contexts/WalletContext';
import { Toaster } from '@/components/ui/toaster';
import Index from '@/pages/Index';
import PaymentComplete from '@/pages/PaymentComplete';
import AdminLayout from '@/components/admin/AdminLayout';
import Dashboard from '@/components/admin/Dashboard';
import Users from '@/components/admin/Users';
import Settings from '@/components/admin/Settings';
import UserDashboard from '@/pages/Dashboard';
import AccessDenied from '@/pages/AccessDenied';

function App() {
  return (
    <AuthProvider>
      <WalletProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/dashboard" element={<UserDashboard />} />
          <Route path="/payment-complete" element={<PaymentComplete />} />
            <Route path="/access-denied" element={<AccessDenied />} />
          
          {/* Admin Routes */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="users" element={<Users />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
        <Toaster />
      </Router>
      </WalletProvider>
    </AuthProvider>
  );
}

export default App;
