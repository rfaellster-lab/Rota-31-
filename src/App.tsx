/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import CalendarView from './pages/CalendarView';
import History from './pages/History';
import Config from './pages/Config';
import { InvoiceProvider } from './store/InvoiceContext';

export default function App() {
  return (
    <InvoiceProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="calendario" element={<CalendarView />} />
            <Route path="historico" element={<History />} />
            <Route path="configuracao" element={<Config />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </InvoiceProvider>
  );
}
