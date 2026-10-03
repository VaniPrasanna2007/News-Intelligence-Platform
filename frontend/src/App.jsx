import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import CommandCenterPage from './pages/CommandCenterPage';
import OverviewPage from './pages/OverviewPage';
import ClustersConstellationPage from './pages/ClustersConstellationPage';
import CategoriesPage from './pages/CategoriesPage';
import ClassifyPage from './pages/ClassifyPage';
import BatchPage from './pages/BatchPage';
import EvaluationPage from './pages/EvaluationPage';
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
  getStatistics,
  getReviewStats,
  getCategoryConstellation
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
  const [reviewStats, setReviewStats] = useState(null);
  const [constellationData, setConstellationData] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);
  const [activeSecondaryTab, setActiveSecondaryTab] = useState('01');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [healthStatus, setHealthStatus] = useState('connecting'); // 'connecting' | 'connected' | 'offline'

  const loadAllData = async () => {
    setIsRefreshing(true);
    try {
      const [
        healthData,
        summaryData,
        categoriesData,
        modelsData,
        perfData,
        kwData,
        predData,
        statsData,
        reviewData,
        constellationRes
      ] = await Promise.allSettled([
        getHealth(),
        getDatasetSummary(),
        getCategories(),
        getModels(),
        getModelPerformance(),
        getKeywords(),
        getRecentPredictions(50),
        getStatistics(),
        getReviewStats(),
        getCategoryConstellation()
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
      if (reviewData.status === 'fulfilled') setReviewStats(reviewData.value);
      if (constellationRes.status === 'fulfilled') setConstellationData(constellationRes.value);
    } catch (err) {
      console.error('Error fetching dashboard state:', err);
      setHealthStatus('offline');
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadAllData();

    // Heartbeat health checker and live prediction activity poller
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

    // Optimistically update recent predictions so newest is first without duplicates
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
      {/* Global Static Reference Background Layer for Internal Pages */}
      <InternalBackground />

      {/* Top Navigation */}
      <Navbar
        health={health}
        healthStatus={healthStatus}
        stats={stats}
      />

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden relative z-10">
        {/* Navigation Sidebar */}
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Dynamic Page Content */}
        <main className="flex-1 overflow-y-auto p-8 max-w-7xl mx-auto w-full relative z-10">
          {activeTab === 'command_center' && (
            <CommandCenterPage
              analysisData={analysisData}
              setAnalysisData={setAnalysisData}
              constellationData={constellationData}
              reviewStats={reviewStats}
              onReviewSubmitted={() => getReviewStats().then(setReviewStats).catch(() => {})}
              onAnalysisStart={handleAnalysisStart}
              onAnalysisSuccess={handleAnalysisSuccess}
              onAnalysisError={handleAnalysisError}
              activeSecondaryTab={activeSecondaryTab}
              setActiveSecondaryTab={setActiveSecondaryTab}
            />
          )}

          {activeTab === 'overview' && (
            <OverviewPage
              summary={summary}
              categories={categories}
              models={models}
              performance={performance}
              keywords={keywords}
              recentPredictions={recentPredictions}
              stats={stats}
              health={health}
              liveActivity={liveActivity}
              onNavigateToClassify={() => setActiveTab('command_center')}
            />
          )}

          {activeTab === 'clusters' && (
            <ClustersConstellationPage
              constellationData={constellationData}
            />
          )}

          {activeTab === 'evaluation' && (
            <EvaluationPage
              performance={performance}
              models={models}
            />
          )}

          {activeTab === 'categories' && (
            <CategoriesPage
              summary={summary}
              categories={categories}
              keywords={keywords}
            />
          )}

          {activeTab === 'classify' && (
            <ClassifyPage onPredictionSuccess={handlePredictionSuccess} />
          )}

          {activeTab === 'batch' && (
            <BatchPage />
          )}
        </main>
      </div>
    </div>
  );
}
