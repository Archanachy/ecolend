// EcoLend frontend — root component and route table.
// Pages are added to this table as they are built; AuthContext and the
// design-system chrome wrap this in later steps.
import { Routes, Route, Link } from 'react-router-dom';

function Home() {
  return (
    <main>
      <h1>EcoLend</h1>
      <p>Secure peer-to-peer tool &amp; equipment lending.</p>
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
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
