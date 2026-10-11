import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { VoiceProvider } from './context/VoiceContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { VoiceModal } from './components/VoiceModal';
import { AuthModal } from './components/AuthModal';

import { Home } from './pages/Home';
import { BusSearchPage } from './pages/BusSearchPage';
import { BusDetailsPage } from './pages/BusDetailsPage';
import { SeatSelectionPage } from './pages/SeatSelectionPage';
import { MockPaymentPage } from './pages/MockPaymentPage';
import { TicketPage } from './pages/TicketPage';
import { MyBookingsPage } from './pages/MyBookingsPage';
import { LiveTrackingPage } from './pages/LiveTrackingPage';
import { FeedbackPage } from './pages/FeedbackPage';
import { ComplaintsPage } from './pages/ComplaintsPage';
import { AIAssistantPage } from './pages/AIAssistantPage';
import { NLPDemoPage } from './pages/NLPDemoPage';
import { UserProfilePage } from './pages/UserProfilePage';
import { AdminDashboard } from './pages/AdminDashboard';
import { OperatorDashboard } from './pages/OperatorDashboard';

export function App() {
  const [authModalOpen, setAuthModalOpen] = useState(false);

  return (
    <AuthProvider>
      <VoiceProvider>
        <BrowserRouter>
          <div className="flex flex-col min-h-screen bg-slate-50 text-slate-800">
            <Navbar onOpenAuth={() => setAuthModalOpen(true)} />
            
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/search" element={<BusSearchPage />} />
                <Route path="/buses/:id" element={<BusDetailsPage />} />
                <Route path="/select-seats/:id" element={<SeatSelectionPage />} />
                <Route path="/mock-payment" element={<MockPaymentPage />} />
                <Route path="/ticket/:id" element={<TicketPage />} />
                <Route path="/my-bookings" element={<MyBookingsPage />} />
                <Route path="/tracking/:id" element={<LiveTrackingPage />} />
                <Route path="/tracking" element={<LiveTrackingPage />} />
                <Route path="/feedback" element={<FeedbackPage />} />
                <Route path="/complaints" element={<ComplaintsPage />} />
                <Route path="/ai-assistant" element={<AIAssistantPage />} />
                <Route path="/nlp-demo" element={<NLPDemoPage />} />
                <Route path="/profile" element={<UserProfilePage />} />
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/operator" element={<OperatorDashboard />} />
              </Routes>
            </main>

            <Footer />

            <VoiceModal />
            <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
          </div>
        </BrowserRouter>
      </VoiceProvider>
    </AuthProvider>
  );
}

export default App;
