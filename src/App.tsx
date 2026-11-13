import { AnimatePresence, MotionConfig } from 'framer-motion';
import { useEffect } from 'react';
import { Link, Route, Routes, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import MindMapPage from './pages/MindMapPage';
import PracticeButton from './components/PracticeButton';
import NotFound from './pages/NotFound';
import QuizPage from './pages/QuizPage';

export default function App() {
  const location = useLocation();
  // Opening a node only changes the last URL segment; keep the page mounted for that.
  const pageKey = location.pathname.split('/').slice(0, 3).join('/');
  // Map and quiz pages have their own toolbar so the content gets the whole screen.
  const showNav = !/^\/(map|quiz)(\/|$)/.test(location.pathname);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pageKey]);

  return (
    <MotionConfig reducedMotion="user">
      {showNav && (
        <header className="site-nav">
          <div className="container">
            <Link to="/" className="wordmark">
              <span className="wordmark-mark" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <rect x="2" y="2" width="16" height="4" rx="1.5" />
                  <rect x="2" y="8" width="7" height="10" rx="1.5" />
                  <rect x="11" y="8" width="3" height="10" rx="1.5" />
                  <rect x="15.5" y="8" width="2.5" height="10" rx="1.25" />
                </svg>
              </span>
              CISSP Mind Maps
            </Link>
            <PracticeButton />
          </div>
        </header>
      )}

      <AnimatePresence mode="wait">
        <Routes location={location} key={pageKey}>
          <Route path="/" element={<Home />} />
          <Route path="/map/:mapId/:nodeId?" element={<MindMapPage />} />
          <Route path="/quiz" element={<QuizPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AnimatePresence>
    </MotionConfig>
  );
}
