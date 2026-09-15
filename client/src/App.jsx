import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import CustomerListPage from './pages/CustomerListPage.jsx';
import CustomerDetailPage from './pages/CustomerDetailPage.jsx';
import SiteDetailPage from './pages/SiteDetailPage.jsx';
import AuditListPage from './pages/AuditListPage.jsx';
import AuditFormPage from './pages/AuditFormPage.jsx';
import AuditReviewPage from './pages/AuditReviewPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/audits" replace />} />
        <Route path="/customers" element={<CustomerListPage />} />
        <Route path="/customers/:customerId" element={<CustomerDetailPage />} />
        <Route path="/sites/:siteId" element={<SiteDetailPage />} />
        <Route path="/audits" element={<AuditListPage />} />
        <Route path="/audits/new" element={<AuditFormPage />} />
        <Route path="/audits/:auditId/edit" element={<AuditFormPage />} />
        <Route path="/audits/:auditId/review" element={<AuditReviewPage />} />
        <Route path="*" element={<Navigate to="/audits" replace />} />
      </Route>
    </Routes>
  );
}
