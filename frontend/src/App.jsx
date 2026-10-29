import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import CommandCenterPage from './pages/CommandCenterPage';
import OverviewPage from './pages/OverviewPage';
import LandingPage from './pages/LandingPage';
import InternalBackground from './components/InternalBackground';

import {
  getHealth,
  getDatasetSummary,
  getCategories,
  getModels,
  getModelPerformance,
  getKeywords,
  getRecentPredictions,
  getStatistics
} from './services/api';

export default function App() {
  const [showLanding, setShowLanding] = useState(() => {
    return window.location.hash !== '#platform';
  });
  const [activeTab, setActiveTab] = useState('command_center');
  const [health, setHealth] = useState(null);
  const [summary, setSummary] = useState(null);
  const [categories, setCategories] = useState(null);
  const [models, setModels] = useState(null);
  const [performance, setPerformance] = useState(null);
  const [keywords, setKeywords] = useState(null);
  const [recentPredictions, setRecentPredictions] = useState([]);
  const [stats, setStats] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);
  const [healthStatus, setHealthStatus] = useState('connecting'); // 'connecting' | 'connected' | 'offline'

  const loadAllData = async () => {
    try {
      const [
        healthData,
        summaryData,
        categoriesData,
        modelsData,
        perfData,
        kwData,
        predData,
        statsData
      ] = await Promise.allSettled([
        getHealth(),
        getDatasetSummary(),
        getCategories(),
        getModels(),
        getModelPerformance(),
        getKeywords(),
        getRecentPredictions(50),
        getStatistics()
      ]);

      if (healthData.status === 'fulfilled' && (healthData.value?.status === 'healthy' || healthData.value?.status === 'degraded')) {
        setHealth(healthData.value);
        setHealthStatus('connected');
      } else {
        setHealth(null);
        setHealthStatus('offline');
      }

      if (summaryData.status === 'fulfilled') setSummary(summaryData.value);
      if (categoriesData.status === 'fulfilled') setCategories(categoriesData.value);
      if (modelsData.status === 'fulfilled') setModels(modelsData.value);
      if (perfData.status === 'fulfilled') setPerformance(perfData.value);
      if (kwData.status === 'fulfilled') setKeywords(kwData.value);
      if (predData.status === 'fulfilled') setRecentPredictions(predData.value);
      if (statsData.status === 'fulfilled') setStats(statsData.value);
    } catch (err) {
      console.error('Error fetching platform state:', err);
      setHealthStatus('offline');
    }
  };

  useEffect(() => {
    loadAllData();

    // Poller for live telemetry and recent predictions
    const interval = setInterval(async () => {
      try {
        const [res, recentRes, statsRes] = await Promise.allSettled([
          getHealth(),
          getRecentPredictions(50),
          getStatistics()
        ]);

        if (res.status === 'fulfilled' && (res.value?.status === 'healthy' || res.value?.status === 'degraded')) {
          setHealth(res.value);
          setHealthStatus('connected');
        } else {
          setHealthStatus('offline');
        }

        if (recentRes.status === 'fulfilled' && Array.isArray(recentRes.value)) {
          setRecentPredictions(recentRes.value);
        }

        if (statsRes.status === 'fulfilled' && statsRes.value) {
          setStats(statsRes.value);
        }
      } catch {
        setHealthStatus('offline');
      }
    }, 6000);

    return () => clearInterval(interval);
  }, []);

  const [liveActivity, setLiveActivity] = useState({
    status: 'idle', // 'idle' | 'analyzing' | 'completed' | 'error'
    headline: '',
    sourceType: '',
    prediction: '',
    confidence: null,
    timestamp: null,
    errorMessage: ''
  });

  const handleAnalysisStart = ({ sourceType, headline }) => {
    setLiveActivity({
      status: 'analyzing',
      headline: headline || '',
      sourceType: sourceType || 'Text',
      prediction: '',
      confidence: null,
      timestamp: new Date().toISOString(),
      errorMessage: ''
    });
  };

  const handleAnalysisSuccess = (newPred) => {
    setLiveActivity({
      status: 'completed',
      headline: newPred.headline || newPred.article_text || '',
      sourceType: newPred.source_type || 'Text',
      prediction: newPred.predicted_category,
      confidence: newPred.confidence,
      timestamp: newPred.timestamp || new Date().toISOString(),
      errorMessage: ''
    });

    // Optimistically update recent predictions
    setRecentPredictions((prev) => {
      const rest = (prev || []).filter((p) => p.prediction_id !== newPred.prediction_id);
      return [newPred, ...rest];
    });

    // Refresh live statistics immediately
    getStatistics().then((s) => setStats(s)).catch(() => {});
  };

  const handleAnalysisError = ({ error, sourceType }) => {
    setLiveActivity({
      status: 'error',
      headline: '',
      sourceType: sourceType || '',
      prediction: '',
      confidence: null,
      timestamp: new Date().toISOString(),
      errorMessage: error || 'Article analysis failed.'
    });
  };

  const handleEnterPlatform = () => {
    setShowLanding(false);
    window.history.pushState({ page: 'platform' }, '', '#platform');
  };

  useEffect(() => {
    const handlePopState = () => {
      if (window.location.hash === '#platform') {
        setShowLanding(false);
      } else {
        setShowLanding(true);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  if (showLanding) {
    return <LandingPage onEnter={handleEnterPlatform} />;
  }

  return (
    <div className="min-h-screen relative flex flex-col">
      {/* Background Layer */}
      <InternalBackground />

      {/* Top Navigation */}
      <Navbar
        health={health}
        healthStatus={healthStatus}
        stats={stats}
      />

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden relative z-10">
        {/* Navigation Sidebar (Command Center & Live Overview only) */}
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Dynamic Page Content */}
        <main className="flex-1 overflow-y-auto p-8 max-w-7xl mx-auto w-full relative z-10">
          {activeTab === 'command_center' && (
            <CommandCenterPage
              analysisData={analysisData}
              setAnalysisData={setAnalysisData}
              onAnalysisStart={handleAnalysisStart}
              onAnalysisSuccess={handleAnalysisSuccess}
              onAnalysisError={handleAnalysisError}
            />
          )}

          {activeTab === 'overview' && (
            <OverviewPage
              summary={summary}
              categories={categories}
              models={models}
              performance={performance}
              recentPredictions={recentPredictions}
              stats={stats}
              health={health}
              liveActivity={liveActivity}
              onNavigateToClassify={() => setActiveTab('command_center')}
            />
          )}
        </main>
      </div>
    </div>
  );
}
