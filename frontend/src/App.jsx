// EcoLend frontend — root component and route table.
// Pages are added to this table as they are built; the design-system chrome
// wraps this in later steps.
import { Routes, Route, Link } from 'react-router-dom';
import Register from './pages/Register';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';

function Home() {
  return (
    <main>
      <h1>EcoLend</h1>
      <p>Secure peer-to-peer tool &amp; equipment lending.</p>
      <p>
        <Link to="/register">Get started</Link> · <Link to="/login">Log in</Link>
      </p>
    </main>
  );
}

function NotFound() {
  return (
    <main>
      <h1>404</h1>
      <Link to="/">Back to home</Link>
    </main>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Dashboard />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
