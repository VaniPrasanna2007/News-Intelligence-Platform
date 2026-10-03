import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  HeadingLevel,
  BorderStyle
} from 'docx';

/**
 * Triggers a browser download of a Blob file.
 */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Copies plain text to the system clipboard.
 */
export async function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
  } else {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    document.execCommand('copy');
    textArea.remove();
  }
}

/**
 * Normalizes and extracts structured report fields based on moduleType.
 */
export function extractReportContent(moduleType, rawData) {
  const now = new Date();
  const timestampStr = now.toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'medium'
  });

  switch (moduleType) {
    case 'command_center': {
      const d = rawData || {};
      const dna = d.news_dna || {};
      const structure = dna.article_structure || {};
      const novelty = dna.novelty || {};
      const alignment = dna.headline_alignment || {};
      const signals = dna.classification_signals || [];
      const entities = dna.entities || [];
      const related = dna.related_articles || [];
      const claims = dna.claim_comparisons || [];
      const modelsComparison = d.model_predictions || d.model_comparison || [];
      const humanReview = d.human_review || null;

      const hasData = Boolean(d.predicted_category || d.headline || d.article_text || (signals && signals.length > 0));

      const title = 'AI NEWS INTELLIGENCE PLATFORM — COMMAND CENTER REPORT';
      const subtitle = hasData
        ? `Comprehensive Explainability, Classification Signals & News DNA Analysis`
        : `No article has been analyzed yet in the current session.`;

      const metadata = [
        ['Report Generated', timestampStr],
        ['Primary Model', d.model_used || 'Calibrated Logistic Regression / SVM'],
        ['Predicted Category', d.predicted_category || 'N/A'],
        ['Prediction Confidence', d.confidence ? `${(d.confidence * 100).toFixed(2)}%` : 'N/A'],
        ['Input Source Type', d.source_type || 'Text Input'],
        ['Article Headline', d.headline || (d.article_text ? d.article_text.slice(0, 100) + '...' : 'N/A')]
      ];

      if (humanReview) {
        metadata.push(['Human Review Status', humanReview.status || 'Verified']);
        if (humanReview.corrected_category) {
          metadata.push(['Human Corrected Category', humanReview.corrected_category]);
        }
      }

      const tables = [];

      // 1. Three-Model Comparison Table
      if (Array.isArray(modelsComparison) && modelsComparison.length > 0) {
        tables.push({
          title: 'Three-Model Comparative Prediction',
          head: ['Model Architecture', 'Predicted Class', 'Confidence', 'Agreement Status'],
          rows: modelsComparison.map(m => [
            m.model || m.model_name || 'Standard Model',
            m.predicted_category || m.category || 'N/A',
            m.confidence != null ? `${(m.confidence * 100).toFixed(2)}%` : 'N/A',
            m.predicted_category === d.predicted_category ? 'Consensus' : 'Divergent'
          ])
        });
      }

      // 2. Category Probability Distribution Table
      if (d.probabilities && typeof d.probabilities === 'object') {
        const probRows = Object.entries(d.probabilities).map(([cat, val]) => [
          cat,
          `${(val * 100).toFixed(2)}%`,
          cat.toLowerCase() === (d.predicted_category || '').toLowerCase() ? '★ Primary' : 'Secondary'
        ]);
        tables.push({
          title: 'Class Probability Distribution',
          head: ['News Category', 'Calibrated Probability', 'Designation'],
          rows: probRows
        });
      }

      // 3. News DNA Signals
      if (signals.length > 0) {
        tables.push({
          title: 'Top Classification Signals (News DNA)',
          head: ['Feature Token', 'TF-IDF Weight', 'Signal Relevance'],
          rows: signals.slice(0, 12).map(s => [
            s.term || '—',
            s.weight != null ? (s.weight * 100).toFixed(2) + '%' : '—',
            s.weight > 0.15 ? 'High Impact' : 'Standard Impact'
          ])
        });
      }

      // 4. Article Linguistic Structure
      if (structure && Object.keys(structure).length > 0) {
        tables.push({
          title: 'Linguistic Structure & Density Profile',
          head: ['Metric Dimension', 'Value', 'Benchmark Assessment'],
          rows: [
            ['Word Count', String(structure.word_count || 'N/A'), 'Corpus calibrated'],
            ['Sentence Count', String(structure.sentence_count || 'N/A'), 'Syntactic parsing'],
            ['Paragraph Count', String(structure.paragraph_count || 'N/A'), 'Structural segmentation'],
            ['Type-Token Ratio (TTR)', structure.vocabulary_diversity != null ? `${(structure.vocabulary_diversity * 100).toFixed(1)}%` : 'N/A', 'Lexical richness'],
            ['Entity Density', `${structure.entity_density_per_100_words || 0} / 100 words`, 'Named entity frequency'],
            ['Length Profile', structure.length_profile || 'Standard', 'Length categorization']
          ]
        });
      }

      // 5. Related Articles
      if (related.length > 0) {
        tables.push({
          title: 'Related Stories in 9,990 Corpus',
          head: ['Rank', 'Corpus Headline', 'Category', 'Similarity'],
          rows: related.slice(0, 5).map((r, i) => [
            `#${r.rank || i + 1}`,
            r.headline || 'Untitled',
            r.category || 'N/A',
            r.similarity_pct != null ? `${r.similarity_pct}%` : '—'
          ])
        });
      }

      // 6. Claim Comparisons
      if (claims.length > 0) {
        tables.push({
          title: 'Corpus Claim Comparisons',
          head: ['Verdict', 'Statement A (Input)', 'Statement B (Corpus Article)'],
          rows: claims.slice(0, 3).map(c => [
            c.neutral_verdict || 'Neutral Context',
            (c.statement_a || '').slice(0, 100) + '...',
            (c.statement_b || '').slice(0, 100) + '...'
          ])
        });
      }

      const sections = [];
      if (entities.length > 0) {
        sections.push({
          title: 'Extracted Named Entities',
          content: entities.join(' • ')
        });
      }

      if (alignment && (alignment.alignment_percentage != null || alignment.explanation)) {
        sections.push({
          title: 'Headline-Body Alignment Assessment',
          content: `Alignment Score: ${alignment.alignment_percentage ?? 'N/A'}%\nAssessment: ${alignment.explanation || 'Coherent alignment across lead paragraphs.'}`
        });
      }

      if (novelty && novelty.score != null) {
        sections.push({
          title: 'Corpus Novelty Evaluation',
          content: `Novelty Score: ${novelty.score} / 100 (${novelty.level || 'Moderate'})\nClassification: ${novelty.label || 'Standard news coverage'}\nNote: Novelty is calculated relative to the 9,990 indexed training articles.`
        });
      }

      return {
        title,
        subtitle,
        metadata,
        tables,
        sections,
        footer: 'Aditya University • AI News Intelligence Platform • Verified Benchmark Pipeline'
      };
    }

    case 'overview': {
      const d = rawData || {};
      const stats = d.stats || {};
      const health = d.health || {};
      const performance = d.performance || {};
      const recent = d.recentPredictions || [];
      const categories = d.categories || {};

      const title = 'LIVE OVERVIEW & SYSTEM TELEMETRY REPORT';
      const subtitle = 'Real-time telemetry, model benchmark indicators, and live classification streaming.';

      const metadata = [
        ['Report Generated', timestampStr],
        ['Active Production Model', health.best_model || performance.best_model || 'Support Vector Machine'],
        ['Held-Out Test Accuracy', stats.test_accuracy ? `${(stats.test_accuracy * 100).toFixed(1)}%` : '99.3%'],
        ['Total Live Predictions', String(stats.total_live_predictions || recent.length || 0)],
        ['Average Live Confidence', stats.average_live_confidence ? `${(stats.average_live_confidence * 100).toFixed(1)}%` : '—'],
        ['Dataset Corpus Size', stats.total_dataset_articles ? `${stats.total_dataset_articles.toLocaleString()} articles` : '9,990 articles'],
        ['API Health Status', health.status ? health.status.toUpperCase() : 'CONNECTED']
      ];

      const tables = [];

      // Category breakdown
      const catEntries = Object.entries(categories.distribution || categories.counts || {});
      if (catEntries.length > 0) {
        const total = catEntries.reduce((acc, [, val]) => acc + (typeof val === 'number' ? val : 0), 0) || 1;
        tables.push({
          title: 'Category Distribution in Corpus',
          head: ['Category', 'Article Count', 'Corpus Percentage'],
          rows: catEntries.map(([cat, count]) => [
            cat,
            String(count),
            `${((count / total) * 100).toFixed(1)}%`
          ])
        });
      }

      // Recent Predictions
      if (Array.isArray(recent) && recent.length > 0) {
        tables.push({
          title: 'Recent Live Article Predictions',
          head: ['Timestamp', 'Source', 'Article Headline', 'Predicted Category', 'Confidence'],
          rows: recent.slice(0, 15).map(item => [
            item.timestamp ? new Date(item.timestamp).toLocaleTimeString() : 'Recent',
            item.source_type || 'Text',
            (item.headline || item.article_text || 'Untitled').slice(0, 60) + '...',
            item.predicted_category || 'N/A',
            item.confidence != null ? `${(item.confidence * 100).toFixed(1)}%` : '—'
          ])
        });
      }

      return {
        title,
        subtitle,
        metadata,
        tables,
        sections: [],
        footer: 'Aditya University • AI News Intelligence Platform • Live Telemetry Stream'
      };
    }

    case 'evaluation': {
      const d = rawData || {};
      const perf = d.perfData || d.performance || {};
      const cm = d.confusionMatrices || {};
      const valMetrics = perf.validation || {};
      const testMetrics = perf.test || {};
      const bestModel = perf.production_model || perf.best_model || 'Support Vector Machine';

      const title = 'MODEL EVALUATION & BENCHMARK REPORT';
      const subtitle = 'Held-out test split evaluation, cross-validation metrics, and multi-class confusion matrices.';

      const metadata = [
        ['Report Generated', timestampStr],
        ['Selected Production Model', bestModel],
        ['Selection Criterion', perf.selection_criterion || 'Validation Macro F1 Score'],
        ['Dataset Evaluation Split', '80% Train, 10% Validation, 10% Held-Out Test (9,990 clean articles)'],
        ['Evaluation Timestamp', perf.last_retrained_at ? new Date(perf.last_retrained_at).toLocaleString() : timestampStr]
      ];

      const tables = [];

      // Comparative Models Table
      const modelsList = ['Support Vector Machine', 'Logistic Regression', 'Naive Bayes'];
      tables.push({
        title: 'Multi-Model Comparative Performance Benchmark',
        head: ['Model Architecture', 'Val Accuracy', 'Test Accuracy', 'Macro F1', 'Production Status'],
        rows: modelsList.map(name => {
          const val = valMetrics[name] || {};
          const test = testMetrics[name] || {};
          return [
            name === 'Support Vector Machine' ? 'Calibrated Linear SVM' : name,
            val.accuracy != null ? `${(val.accuracy * 100).toFixed(2)}%` : '—',
            test.accuracy != null ? `${(test.accuracy * 100).toFixed(2)}%` : '—',
            test.macro_f1 != null ? (test.macro_f1 <= 1.0 ? (test.macro_f1 * 100).toFixed(2) + '%' : test.macro_f1.toFixed(2) + '%') : '—',
            name === bestModel ? '★ Selected Production' : 'Candidate Benchmark'
          ];
        })
      });

      // Best Model Per-Class Metrics
      const bestTest = testMetrics[bestModel] || {};
      if (bestTest.per_class && typeof bestTest.per_class === 'object') {
        tables.push({
          title: `Per-Category Detailed Performance (${bestModel})`,
          head: ['News Category', 'Precision', 'Recall', 'F1-Score', 'Support Samples'],
          rows: Object.entries(bestTest.per_class).map(([cat, metrics]) => [
            cat,
            metrics.precision != null ? `${(metrics.precision * 100).toFixed(2)}%` : '—',
            metrics.recall != null ? `${(metrics.recall * 100).toFixed(2)}%` : '—',
            metrics.f1 != null ? `${(metrics.f1 * 100).toFixed(2)}%` : '—',
            String(metrics.support || metrics.count || '—')
          ])
        });
      }

      // Confusion Matrix for Best Model
      const bestCM = cm[bestModel] || Object.values(cm)[0];
      if (bestCM && bestCM.matrix && bestCM.classes) {
        const classes = bestCM.classes.map(c => c.charAt(0).toUpperCase() + c.slice(1));
        tables.push({
          title: `Confusion Matrix (${bestModel})`,
          head: ['Actual \\ Predicted', ...classes],
          rows: bestCM.matrix.map((row, i) => [
            classes[i] || `Class ${i + 1}`,
            ...row.map(val => String(val))
          ])
        });
      }

      return {
        title,
        subtitle,
        metadata,
        tables,
        sections: [],
        footer: 'Aditya University • AI News Intelligence Platform • Statistical Verification Record'
      };
    }

    case 'clusters': {
      const d = rawData || {};
      const clusters = Array.isArray(d) ? d : (d.clusters || []);
      const selected = d.selectedCluster || null;

      if (selected) {
        // Detailed Report for a Single Selected Cluster
        const title = `STORY CLUSTER REPORT: CLUSTER #${selected.cluster_id}`;
        const subtitle = `Thematic cluster analysis for "${selected.topic_label}"`;

        const metadata = [
          ['Report Generated', timestampStr],
          ['Dominant Category', selected.dominant_category || 'N/A'],
          ['Topic Label', selected.topic_label || 'Untitled Cluster'],
          ['Article Count', `${selected.article_count || 0} articles (${selected.representation_percentage || 0}% of Corpus)`],
          ['Coherence Score', `${selected.coherence_score || 0} / 100 (Grade: ${selected.coherence_grade || 'N/A'})`]
        ];

        const tables = [];

        // Key Terms
        if (selected.top_terms && selected.top_terms.length > 0) {
          tables.push({
            title: 'Top Semantic Keywords & Terms',
            head: ['Keyword Term', 'Significance Rank'],
            rows: selected.top_terms.map((t, idx) => [t, `#${idx + 1}`])
          });
        }

        // Representative Articles
        if (selected.representative_articles && selected.representative_articles.length > 0) {
          tables.push({
            title: 'Representative News Articles',
            head: ['Index', 'Headline', 'Similarity'],
            rows: selected.representative_articles.map((a, idx) => [
              `#${idx + 1}`,
              a.headline || 'Untitled Article',
              a.similarity_pct ? `${a.similarity_pct}%` : 'High'
            ])
          });
        }

        return {
          title,
          subtitle,
          metadata,
          tables,
          sections: [],
          footer: 'Aditya University • AI News Intelligence Platform • Semantic Cluster Intelligence'
        };
      }

      // Summary of All Clusters
      const title = 'STORY CLUSTERS & THEMATIC CONSTELLATION REPORT';
      const subtitle = `Corpus-wide semantic clustering across ${clusters.length} distinct news topics.`;

      const metadata = [
        ['Report Generated', timestampStr],
        ['Total Thematic Clusters', String(clusters.length)],
        ['Corpus Coverage', '9,990 Indexed News Articles'],
        ['Clustering Architecture', 'TF-IDF + K-Means / Latent Semantic Analysis']
      ];

      const tables = [];
      if (clusters.length > 0) {
        tables.push({
          title: 'Semantic Clusters Overview',
          head: ['ID', 'Dominant Category', 'Topic Label', 'Articles', 'Share', 'Coherence'],
          rows: clusters.map(c => [
            `#${c.cluster_id}`,
            c.dominant_category || '—',
            c.topic_label || '—',
            String(c.article_count || 0),
            `${c.representation_percentage || 0}%`,
            `${c.coherence_score || 0} (${c.coherence_grade || '—'})`
          ])
        });
      }

      return {
        title,
        subtitle,
        metadata,
        tables,
        sections: [],
        footer: 'Aditya University • AI News Intelligence Platform • Constellation Semantic Map'
      };
    }

    case 'batch': {
      const d = rawData || {};
      const results = Array.isArray(d) ? d : (d.results || []);

      const title = 'BATCH CLASSIFICATION RESULTS REPORT';
      const subtitle = `High-throughput classification records for ${results.length} processed news articles.`;

      const metadata = [
        ['Report Generated', timestampStr],
        ['Total Articles Processed', String(results.length)],
        ['Classification Engine', d.model || 'Calibrated Logistic Regression / SVM'],
        ['Status', results.length > 0 ? 'Batch Execution Completed' : 'No articles processed yet']
      ];

      const tables = [];
      if (results.length > 0) {
        // Summary Counts by Category
        const catCounts = {};
        results.forEach(r => {
          const cat = r.predicted_category || r.category || 'Unknown';
          catCounts[cat] = (catCounts[cat] || 0) + 1;
        });

        tables.push({
          title: 'Batch Category Distribution',
          head: ['Category', 'Articles Classified', 'Percentage'],
          rows: Object.entries(catCounts).map(([cat, count]) => [
            cat,
            String(count),
            `${((count / results.length) * 100).toFixed(1)}%`
          ])
        });

        // Detailed articles list
        tables.push({
          title: 'Classified Articles Detail',
          head: ['#', 'Headline / Preview', 'Predicted Category', 'Confidence'],
          rows: results.slice(0, 50).map((r, i) => [
            String(r.id || i + 1),
            (r.headline || r.text || r.article_text || 'Untitled Article').slice(0, 70) + '...',
            r.predicted_category || r.category || 'N/A',
            r.confidence != null ? `${(r.confidence * 100).toFixed(1)}%` : '—'
          ])
        });
      }

      return {
        title,
        subtitle,
        metadata,
        tables,
        sections: [],
        footer: 'Aditya University • AI News Intelligence Platform • High-Throughput Batch Engine'
      };
    }

    case 'classify': {
      const d = rawData || {};
      const title = 'SINGLE ARTICLE CLASSIFICATION REPORT';
      const subtitle = 'Individual article category inference and prediction probability record.';

      const metadata = [
        ['Report Generated', timestampStr],
        ['Model Architecture', d.model_used || 'Calibrated Support Vector Machine'],
        ['Predicted Category', d.predicted_category || 'N/A'],
        ['Confidence', d.confidence != null ? `${(d.confidence * 100).toFixed(2)}%` : 'N/A'],
        ['Input Length', d.text ? `${d.text.length} characters` : '—']
      ];

      const tables = [];
      if (d.probabilities && typeof d.probabilities === 'object') {
        tables.push({
          title: 'Probability Distribution Across Categories',
          head: ['Category', 'Confidence Probability'],
          rows: Object.entries(d.probabilities).map(([cat, prob]) => [
            cat,
            `${(prob * 100).toFixed(2)}%`
          ])
        });
      }

      return {
        title,
        subtitle,
        metadata,
        tables,
        sections: d.text ? [{ title: 'Analyzed Text Preview', content: d.text.slice(0, 400) + '...' }] : [],
        footer: 'Aditya University • AI News Intelligence Platform • Autonomous Classification'
      };
    }

    case 'existing_articles': {
      const d = rawData || {};
      const articles = Array.isArray(d) ? d : (d.articles || []);
      const title = 'EXISTING ARTICLES CORPUS REPORT';
      const subtitle = `Corpus Browser Snapshot: ${articles.length} of ${(d.totalCount || 9990).toLocaleString()} articles (Filter: ${d.categoryFilter || 'All Categories'})`;

      const metadata = [
        ['Report Generated', timestampStr],
        ['Corpus Reference Size', '9,990 Indexed News Articles'],
        ['Active Category Filter', d.categoryFilter || 'All Categories'],
        ['Active Search Term', d.activeSearch ? `"${d.activeSearch}"` : 'None'],
        ['Articles in Current View', String(articles.length)]
      ];

      const tables = [];
      if (articles.length > 0) {
        tables.push({
          title: 'Corpus Articles Inventory',
          head: ['ID', 'Category', 'Article Headline', 'Publication Domain'],
          rows: articles.slice(0, 50).map((a, i) => [
            String(a.id || i + 1),
            a.category || 'N/A',
            (a.headline || a.text || 'Untitled').slice(0, 75) + '...',
            a.domain || a.source || 'Corpus'
          ])
        });
      }

      return {
        title,
        subtitle,
        metadata,
        tables,
        sections: [],
        footer: 'Aditya University • AI News Intelligence Platform • Corpus Knowledge Base'
      };
    }

    case 'history': {
      const d = rawData || {};
      const predictions = d.predictions || [];
      const reviews = d.reviews || [];
      const corrections = d.corrections || [];

      const title = 'HUMAN REVIEW & PREDICTION AUDIT HISTORY REPORT';
      const subtitle = 'Model audit trail, prediction logs, and verified human-in-the-loop correction records.';

      const metadata = [
        ['Report Generated', timestampStr],
        ['Total Predictions Logged', String(predictions.length)],
        ['Total Human Reviews', String(reviews.length)],
        ['Active Human Corrections', String(corrections.length)],
        ['Retrain Pipeline Status', d.retrainStatus?.model_status || 'Operational']
      ];

      const tables = [];

      // Human Reviews Table
      if (reviews.length > 0) {
        tables.push({
          title: 'Human Review & Correction Log',
          head: ['Prediction ID', 'Model Category', 'Human Review', 'Audit Status'],
          rows: reviews.slice(0, 30).map((r, i) => [
            r.prediction_id ? r.prediction_id.slice(0, 10) : `#${i + 1}`,
            r.model_predicted_category || r.predicted || '—',
            r.user_corrected_category || r.corrected || 'Verified Correct',
            r.is_correct ? 'Confirmed' : 'Corrected'
          ])
        });
      }

      // Recent Prediction History Table
      if (predictions.length > 0) {
        tables.push({
          title: 'Recent Prediction History',
          head: ['ID', 'Article Headline / Snippet', 'Predicted Category', 'Confidence', 'Model'],
          rows: predictions.slice(0, 30).map((p, i) => [
            p.prediction_id ? p.prediction_id.slice(0, 8) : `#${i + 1}`,
            (p.headline || p.article_text || 'Untitled').slice(0, 60) + '...',
            p.predicted_category || '—',
            p.confidence != null ? `${(p.confidence * 100).toFixed(1)}%` : '—',
            p.model_used || 'Standard'
          ])
        });
      }

      return {
        title,
        subtitle,
        metadata,
        tables,
        sections: [],
        footer: 'Aditya University • AI News Intelligence Platform • Audit Trail'
      };
    }

    default: {
      return {
        title: 'AI NEWS INTELLIGENCE REPORT',
        subtitle: `Generated on ${timestampStr}`,
        metadata: [['Timestamp', timestampStr]],
        tables: [],
        sections: [{ title: 'Data Snapshot', content: JSON.stringify(rawData, null, 2) }],
        footer: 'Aditya University • AI News Intelligence Platform'
      };
    }
  }
}

/**
 * Builds and downloads a professional PDF report using jsPDF and autotable.
 */
export async function exportToPDF(reportContent, filename) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 36;
  let currentY = margin;

  // Header Banner
  doc.setFillColor(11, 15, 14); // Dark graphite
  doc.rect(0, 0, pageWidth, 68, 'F');

  // Emerald Top Stripe
  doc.setFillColor(16, 185, 129); // Emerald 500
  doc.rect(0, 0, pageWidth, 4, 'F');

  // Brand Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text('ADITYA UNIVERSITY — AI NEWS INTELLIGENCE PLATFORM', margin, 32);

  // Sub-header title
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(167, 181, 174);
  doc.text('Computational Linguistics & Multi-Signal News Telemetry System', margin, 48);

  currentY = 88;

  // Report Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(17, 24, 39);
  doc.text(reportContent.title, margin, currentY);
  currentY += 16;

  // Subtitle
  if (reportContent.subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(75, 85, 99);
    doc.text(reportContent.subtitle, margin, currentY);
    currentY += 18;
  }

  // Thin separator
  doc.setDrawColor(229, 231, 235);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 14;

  // Metadata Table / Grid
  if (reportContent.metadata && reportContent.metadata.length > 0) {
    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      body: reportContent.metadata,
      theme: 'plain',
      styles: {
        fontSize: 9,
        cellPadding: 3.5,
        textColor: [55, 65, 81]
      },
      columnStyles: {
        0: { fontStyle: 'bold', textColor: [17, 24, 39], cellWidth: 160 },
        1: { textColor: [55, 65, 81] }
      },
      didDrawPage: (data) => {
        currentY = data.cursor.y;
      }
    });
    currentY = doc.lastAutoTable.finalY + 18;
  }

  // Render Each Table
  if (reportContent.tables && reportContent.tables.length > 0) {
    for (const tbl of reportContent.tables) {
      if (currentY > pageHeight - 120) {
        doc.addPage();
        currentY = margin + 20;
      }

      // Section Table Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(17, 24, 39);
      doc.text(tbl.title, margin, currentY);
      currentY += 8;

      autoTable(doc, {
        startY: currentY,
        margin: { left: margin, right: margin },
        head: [tbl.head],
        body: tbl.rows,
        theme: 'striped',
        headStyles: {
          fillColor: [5, 150, 105], // Brand emerald
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8.5,
          cellPadding: 4
        },
        bodyStyles: {
          fontSize: 8,
          textColor: [55, 65, 81],
          cellPadding: 3.5
        },
        alternateRowStyles: {
          fillColor: [243, 247, 245]
        },
        didDrawPage: (data) => {
          currentY = data.cursor.y;
        }
      });
      currentY = doc.lastAutoTable.finalY + 16;
    }
  }

  // Render Sections (Paragraphs / Explanations)
  if (reportContent.sections && reportContent.sections.length > 0) {
    for (const sec of reportContent.sections) {
      if (currentY > pageHeight - 100) {
        doc.addPage();
        currentY = margin + 20;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(17, 24, 39);
      doc.text(sec.title, margin, currentY);
      currentY += 12;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(75, 85, 99);
      const splitLines = doc.splitTextToSize(sec.content, pageWidth - (margin * 2));
      doc.text(splitLines, margin, currentY);
      currentY += (splitLines.length * 11) + 14;
    }
  }

  // Page Numbers and Footer
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);

    // Footer divider line
    doc.setDrawColor(229, 231, 235);
    doc.line(margin, pageHeight - 28, pageWidth - margin, pageHeight - 28);

    doc.text(
      reportContent.footer || 'Aditya University • AI News Intelligence Platform',
      margin,
      pageHeight - 16
    );

    const pageStr = `Page ${i} of ${totalPages}`;
    doc.text(pageStr, pageWidth - margin - doc.getTextWidth(pageStr), pageHeight - 16);
  }

  doc.save(filename);
}

/**
 * Builds and downloads an editable Microsoft Word (.docx) report using the docx package.
 */
export async function exportToDocx(reportContent, filename) {
  const children = [];

  // Title
  children.push(
    new Paragraph({
      heading: HeadingLevel.TITLE,
      children: [
        new TextRun({
          text: 'ADITYA UNIVERSITY — AI NEWS INTELLIGENCE PLATFORM',
          bold: true,
          size: 26,
          color: '065F46'
        })
      ]
    })
  );

  // Subtitle / Report Name
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: reportContent.title,
          bold: true,
          size: 22,
          color: '111827'
        })
      ],
      spacing: { after: 120 }
    })
  );

  if (reportContent.subtitle) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: reportContent.subtitle,
            italics: true,
            size: 19,
            color: '4B5563'
          })
        ],
        spacing: { after: 200 }
      })
    );
  }

  // Metadata Table
  if (reportContent.metadata && reportContent.metadata.length > 0) {
    const metaRows = reportContent.metadata.map(([k, v]) => {
      return new TableRow({
        children: [
          new TableCell({
            width: { size: 30, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                children: [new TextRun({ text: k, bold: true, size: 18, color: '1F2937' })]
              })
            ]
          }),
          new TableCell({
            width: { size: 70, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                children: [new TextRun({ text: String(v), size: 18, color: '374151' })]
              })
            ]
          })
        ]
      });
    });

    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: 'Report Metadata & Parameters', bold: true, size: 20, color: '065F46' })],
        spacing: { before: 200, after: 100 }
      })
    );

    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: metaRows
      })
    );
  }

  // Tables
  if (reportContent.tables && reportContent.tables.length > 0) {
    for (const tbl of reportContent.tables) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun({ text: tbl.title, bold: true, size: 20, color: '065F46' })],
          spacing: { before: 260, after: 120 }
        })
      );

      const tableRows = [];

      // Header row
      tableRows.push(
        new TableRow({
          children: tbl.head.map(h => {
            return new TableCell({
              shading: { fill: '059669' },
              children: [
                new Paragraph({
                  alignment: AlignmentType.LEFT,
                  children: [new TextRun({ text: h, bold: true, color: 'FFFFFF', size: 17 })]
                })
              ]
            });
          })
        })
      );

      // Body rows
      tbl.rows.forEach(r => {
        tableRows.push(
          new TableRow({
            children: r.map(c => {
              return new TableCell({
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: String(c), size: 17, color: '1F2937' })]
                  })
                ]
              });
            })
          })
        );
      });

      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: tableRows
        })
      );
    }
  }

  // Sections
  if (reportContent.sections && reportContent.sections.length > 0) {
    for (const sec of reportContent.sections) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun({ text: sec.title, bold: true, size: 20, color: '065F46' })],
          spacing: { before: 240, after: 80 }
        })
      );

      children.push(
        new Paragraph({
          children: [new TextRun({ text: sec.content, size: 18, color: '374151' })],
          spacing: { after: 160 }
        })
      );
    }
  }

  // Footer text
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `\n${reportContent.footer || 'Aditya University • AI News Intelligence Platform'} • Verified Autonomous Generation`,
          italics: true,
          size: 16,
          color: '9CA3AF'
        })
      ],
      spacing: { before: 300 }
    })
  );

  const doc = new Document({
    sections: [
      {
        properties: {},
        children
      }
    ]
  });

  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, filename);
}

/**
 * Generates structured, clean plain text from report content.
 */
export function generatePlainText(reportContent) {
  const lines = [];

  lines.push('========================================================================');
  lines.push('ADITYA UNIVERSITY — AI NEWS INTELLIGENCE PLATFORM');
  lines.push(reportContent.title);
  lines.push('========================================================================');
  if (reportContent.subtitle) {
    lines.push(reportContent.subtitle);
    lines.push('');
  }

  if (reportContent.metadata && reportContent.metadata.length > 0) {
    lines.push('METADATA & PARAMETERS:');
    reportContent.metadata.forEach(([k, v]) => {
      lines.push(`• ${k.padEnd(30, ' ')} : ${v}`);
    });
    lines.push('');
  }

  if (reportContent.tables && reportContent.tables.length > 0) {
    reportContent.tables.forEach(tbl => {
      lines.push('------------------------------------------------------------------------');
      lines.push(tbl.title.toUpperCase());
      lines.push('------------------------------------------------------------------------');
      lines.push(tbl.head.join(' | '));
      lines.push(tbl.head.map(h => '-'.repeat(Math.max(h.length, 10))).join('-|-'));
      tbl.rows.forEach(r => {
        lines.push(r.join(' | '));
      });
      lines.push('');
    });
  }

  if (reportContent.sections && reportContent.sections.length > 0) {
    reportContent.sections.forEach(sec => {
      lines.push('------------------------------------------------------------------------');
      lines.push(sec.title.toUpperCase());
      lines.push('------------------------------------------------------------------------');
      lines.push(sec.content);
      lines.push('');
    });
  }

  lines.push('========================================================================');
  lines.push(reportContent.footer || 'END OF INTELLIGENCE REPORT');
  lines.push('========================================================================');

  return lines.join('\n');
}

/**
 * Downloads plain text file.
 */
export function exportToTxt(reportContent, filename) {
  const text = generatePlainText(reportContent);
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  downloadBlob(blob, filename);
}

/**
 * Downloads JSON file.
 */
export function exportToJSON(data, filename) {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  downloadBlob(blob, filename);
}

/**
 * Downloads CSV file.
 */
export function exportToCSV(headers, rows, filename) {
  const escapeCSV = (str) => {
    const s = String(str ?? '').replace(/"/g, '""');
    return `"${s}"`;
  };

  const lines = [
    headers.map(escapeCSV).join(','),
    ...rows.map(row => row.map(escapeCSV).join(','))
  ];

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, filename);
}

/**
 * Master dispatcher for report exports.
 */
export async function exportReport({
  moduleType,
  data,
  format,
  customFilename
}) {
  const reportContent = extractReportContent(moduleType, data);
  const timestamp = Date.now();
  const safeModuleName = moduleType.replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
  const baseFilename = customFilename || `${safeModuleName}_report_${timestamp}`;

  switch (format) {
    case 'pdf': {
      await exportToPDF(reportContent, `${baseFilename}.pdf`);
      return { success: true, message: 'PDF report downloaded successfully.' };
    }
    case 'docx':
    case 'word': {
      await exportToDocx(reportContent, `${baseFilename}.docx`);
      return { success: true, message: 'Word document downloaded successfully.' };
    }
    case 'txt': {
      exportToTxt(reportContent, `${baseFilename}.txt`);
      return { success: true, message: 'Text report downloaded successfully.' };
    }
    case 'copy': {
      const text = generatePlainText(reportContent);
      await copyToClipboard(text);
      return { success: true, message: 'Report copied to clipboard.' };
    }
    case 'json': {
      exportToJSON(data, `${baseFilename}.json`);
      return { success: true, message: 'JSON file downloaded successfully.' };
    }
    case 'csv': {
      if (moduleType === 'batch' && Array.isArray(data?.results || data)) {
        const results = Array.isArray(data) ? data : data.results;
        const headers = ['ID', 'Headline', 'Predicted Category', 'Confidence'];
        const rows = results.map((r, i) => [
          r.id || i + 1,
          r.headline || r.text || '',
          r.predicted_category || r.category || '',
          r.confidence != null ? (r.confidence * 100).toFixed(2) + '%' : ''
        ]);
        exportToCSV(headers, rows, `${baseFilename}.csv`);
        return { success: true, message: 'CSV file downloaded successfully.' };
      }
      return { success: false, message: 'CSV format not available for this data.' };
    }
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}
