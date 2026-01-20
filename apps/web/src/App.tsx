import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Home } from '@/pages/Home';
import { Threads } from '@/pages/Threads';
import { Timing } from '@/pages/Timing';
import { Templates } from '@/pages/Templates';
import { Shell } from '@/components/layout/Shell';

export function App() {
  return (
    <BrowserRouter>
      <Shell>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/threads" element={<Threads />} />
          <Route path="/timing" element={<Timing />} />
          <Route path="/templates" element={<Templates />} />
        </Routes>
      </Shell>
    </BrowserRouter>
  );
}
