import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './app/Layout'
import Dashboard from './pages/Dashboard'
import Issues from './pages/Issues'
import IssueDetail from './pages/IssueDetail'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import Customers from './pages/Customers'

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/issues" element={<Issues />} />
          <Route path="/issues/:id" element={<IssueDetail />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/customers" element={<Customers />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}

export default App

