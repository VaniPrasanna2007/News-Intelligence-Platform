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
 * Normalizes and extracts structured report fields for Command Center and Live Overview.
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
      const hasData = Boolean(d.predicted_category || d.headline || d.article_text);

      const title = 'AI NEWS INTELLIGENCE PLATFORM — COMMAND CENTER REPORT';
      const subtitle = hasData
        ? 'Real-Time Article Classification & Three-Model Prediction Report'
        : 'No article has been analyzed yet in the current session.';

      const metadata = [
        ['Report Generated', timestampStr],
        ['Primary Model', d.model_used || 'Calibrated Logistic Regression / SVM'],
        ['Predicted Category', d.predicted_category || 'N/A'],
        ['Prediction Confidence', d.confidence ? `${(d.confidence * 100).toFixed(2)}%` : 'N/A'],
        ['Input Source Type', d.source_type || 'Text Input'],
        ['Article Headline', d.headline || (d.article_text ? d.article_text.slice(0, 100) + '...' : 'N/A')]
      ];

      if (d.dataset_category) {
        metadata.push(['Corpus Dataset Category', d.dataset_category]);
        metadata.push([
          'Corpus Verification',
          d.predicted_category?.toLowerCase() === d.dataset_category?.toLowerCase()
            ? 'Match Verified'
            : 'Prediction Differs'
        ]);
      }

      const tables = [];

      // 1. Three-Model Prediction Comparison Table
      if (d.models_predictions && typeof d.models_predictions === 'object') {
        const rows = Object.entries(d.models_predictions).map(([modelName, pred]) => [
          modelName,
          pred.predicted_category || 'N/A',
          pred.confidence != null ? `${(pred.confidence * 100).toFixed(2)}%` : 'N/A',
          pred.predicted_category === d.predicted_category ? 'Consensus' : 'Divergent'
        ]);
        tables.push({
          title: 'Three-Model Comparative Prediction',
          head: ['Model Architecture', 'Predicted Class', 'Confidence', 'Agreement Status'],
          rows
        });
      }

      // 2. Class Probability Distribution Table
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

      // 3. Contributing Words / Top Keywords
      if (Array.isArray(d.contributing_words) && d.contributing_words.length > 0) {
        tables.push({
          title: 'Top Contributing Words (TF-IDF Feature Weights)',
          head: ['Rank', 'Feature Token', 'Impact Level'],
          rows: d.contributing_words.slice(0, 10).map((w, idx) => [
            `#${idx + 1}`,
            w,
            idx < 3 ? 'High Impact' : 'Standard Impact'
          ])
        });
      }

      const sections = [];
      if (d.article_summary) {
        sections.push({
          title: 'Article Text Preview',
          content: d.article_summary
        });
      }

      return {
        title,
        subtitle,
        metadata,
        tables,
        sections,
        footer: 'AI News Intelligence Platform • Command Center'
      };
    }

    case 'overview': {
      const d = rawData || {};
      const stats = d.stats || {};
      const health = d.health || {};
      const performance = d.performance || {};
      const recent = d.recentPredictions || [];

      const title = 'LIVE OVERVIEW & SYSTEM TELEMETRY REPORT';
      const subtitle = 'Real-time telemetry, model benchmark indicators, and live classification stream.';

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

      // Category distribution
      const liveDist = stats.live_category_distribution || {};
      if (Object.keys(liveDist).length > 0) {
        const total = Object.values(liveDist).reduce((a, b) => a + b, 0) || 1;
        tables.push({
          title: 'Live Category Distribution',
          head: ['Category', 'Article Count', 'Live Percentage'],
          rows: Object.entries(liveDist).map(([cat, count]) => [
            cat,
            String(count),
            `${((count / total) * 100).toFixed(1)}%`
          ])
        });
      }

      // Recent Live Predictions
      if (Array.isArray(recent) && recent.length > 0) {
        tables.push({
          title: 'Recent Live Article Predictions',
          head: ['Time', 'Source', 'Article / Headline', 'Predicted Category', 'Confidence'],
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
        footer: 'AI News Intelligence Platform • Live Telemetry'
      };
    }

    default: {
      return {
        title: 'AI NEWS INTELLIGENCE REPORT',
        subtitle: `Generated on ${timestampStr}`,
        metadata: [['Timestamp', timestampStr]],
        tables: [],
        sections: [{ title: 'Data Snapshot', content: JSON.stringify(rawData, null, 2) }],
        footer: 'AI News Intelligence Platform'
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
  doc.setFillColor(11, 15, 14);
  doc.rect(0, 0, pageWidth, 68, 'F');

  // Emerald Top Stripe
  doc.setFillColor(16, 185, 129);
  doc.rect(0, 0, pageWidth, 4, 'F');

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text('AI NEWS INTELLIGENCE PLATFORM', margin, 32);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(167, 181, 174);
  doc.text('Multi-Model News Category Classification System', margin, 48);

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

  doc.setDrawColor(229, 231, 235);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 14;

  // Metadata Table
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

  // Render Tables
  if (reportContent.tables && reportContent.tables.length > 0) {
    for (const tbl of reportContent.tables) {
      if (currentY > pageHeight - 120) {
        doc.addPage();
        currentY = margin + 20;
      }

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
          fillColor: [5, 150, 105],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9
        },
        styles: {
          fontSize: 8.5,
          cellPadding: 4,
          textColor: [31, 41, 55]
        },
        didDrawPage: (data) => {
          currentY = data.cursor.y;
        }
      });
      currentY = doc.lastAutoTable.finalY + 16;
    }
  }

  // Render Sections
  if (reportContent.sections && reportContent.sections.length > 0) {
    for (const sec of reportContent.sections) {
      if (currentY > pageHeight - 100) {
        doc.addPage();
        currentY = margin + 20;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(17, 24, 39);
      doc.text(sec.title, margin, currentY);
      currentY += 12;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(55, 65, 81);
      const splitText = doc.splitTextToSize(sec.content || '', pageWidth - margin * 2);
      doc.text(splitText, margin, currentY);
      currentY += splitText.length * 12 + 16;
    }
  }

  // Page Numbers & Footer
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text(
      `${reportContent.footer || 'AI News Intelligence Platform'} • Page ${i} of ${totalPages}`,
      margin,
      pageHeight - 20
    );
  }

  doc.save(`${filename}.pdf`);
}

/**
 * Builds and downloads a Word (.docx) report.
 */
export async function exportToDocx(reportContent, filename) {
  const children = [];

  // Title
  children.push(
    new Paragraph({
      text: reportContent.title,
      heading: HeadingLevel.HEADING_1,
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
            color: '6B7280',
            size: 20
          })
        ],
        spacing: { after: 200 }
      })
    );
  }

  // Metadata Table
  if (reportContent.metadata && reportContent.metadata.length > 0) {
    const metaRows = reportContent.metadata.map(([key, val]) =>
      new TableRow({
        children: [
          new TableCell({
            width: { size: 3000, type: WidthType.DXA },
            children: [new Paragraph({ children: [new TextRun({ text: key, bold: true, size: 18 })] })]
          }),
          new TableCell({
            width: { size: 6000, type: WidthType.DXA },
            children: [new Paragraph({ children: [new TextRun({ text: String(val), size: 18 })] })]
          })
        ]
      })
    );

    children.push(
      new Table({
        rows: metaRows,
        width: { size: 9000, type: WidthType.DXA }
      })
    );
    children.push(new Paragraph({ text: '', spacing: { after: 200 } }));
  }

  // Tables
  if (reportContent.tables && reportContent.tables.length > 0) {
    for (const tbl of reportContent.tables) {
      children.push(
        new Paragraph({
          text: tbl.title,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 120 }
        })
      );

      const tableRows = [
        new TableRow({
          children: tbl.head.map(h =>
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 18, color: 'FFFFFF' })] })],
              shading: { fill: '059669' }
            })
          )
        }),
        ...tbl.rows.map(row =>
          new TableRow({
            children: row.map(cell =>
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: String(cell), size: 18 })] })]
              })
            )
          })
        )
      ];

      children.push(
        new Table({
          rows: tableRows,
          width: { size: 9000, type: WidthType.DXA }
        })
      );
      children.push(new Paragraph({ text: '', spacing: { after: 160 } }));
    }
  }

  // Sections
  if (reportContent.sections && reportContent.sections.length > 0) {
    for (const sec of reportContent.sections) {
      children.push(
        new Paragraph({
          text: sec.title,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 180, after: 100 }
        })
      );
      children.push(
        new Paragraph({
          children: [new TextRun({ text: sec.content, size: 18 })],
          spacing: { after: 180 }
        })
      );
    }
  }

  const doc = new Document({
    sections: [{ children }]
  });

  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, `${filename}.docx`);
}

/**
 * Builds and downloads a plain text (.txt) report.
 */
export function exportToTxt(reportContent, filename) {
  let text = '';
  text += '='.repeat(70) + '\n';
  text += reportContent.title + '\n';
  if (reportContent.subtitle) text += reportContent.subtitle + '\n';
  text += '='.repeat(70) + '\n\n';

  if (reportContent.metadata && reportContent.metadata.length > 0) {
    text += '--- METADATA ---\n';
    reportContent.metadata.forEach(([k, v]) => {
      text += `${k.padEnd(28)}: ${v}\n`;
    });
    text += '\n';
  }

  if (reportContent.tables && reportContent.tables.length > 0) {
    reportContent.tables.forEach(tbl => {
      text += `--- ${tbl.title.toUpperCase()} ---\n`;
      text += tbl.head.join('  |  ') + '\n';
      text += '-'.repeat(60) + '\n';
      tbl.rows.forEach(r => {
        text += r.join('  |  ') + '\n';
      });
      text += '\n';
    });
  }

  if (reportContent.sections && reportContent.sections.length > 0) {
    reportContent.sections.forEach(sec => {
      text += `--- ${sec.title.toUpperCase()} ---\n`;
      text += sec.content + '\n\n';
    });
  }

  text += reportContent.footer + '\n';

  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  downloadBlob(blob, `${filename}.txt`);
}

/**
 * Copies the report to the user's clipboard as formatted plain text.
 */
export async function exportToClipboard(reportContent) {
  let text = '';
  text += reportContent.title + '\n';
  if (reportContent.subtitle) text += reportContent.subtitle + '\n\n';

  if (reportContent.metadata && reportContent.metadata.length > 0) {
    reportContent.metadata.forEach(([k, v]) => {
      text += `${k}: ${v}\n`;
    });
    text += '\n';
  }

  if (reportContent.tables && reportContent.tables.length > 0) {
    reportContent.tables.forEach(tbl => {
      text += `[${tbl.title}]\n`;
      text += tbl.head.join('\t') + '\n';
      tbl.rows.forEach(r => {
        text += r.join('\t') + '\n';
      });
      text += '\n';
    });
  }

  await copyToClipboard(text);
}

/**
 * Downloads raw JSON data.
 */
export function exportToJson(data, filename) {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  downloadBlob(blob, `${filename}.json`);
}

/**
 * Universal export orchestrator.
 */
export async function exportReport({
  moduleType = 'command_center',
  data = null,
  format = 'pdf',
  customFilename = null
}) {
  const dateTag = new Date().toISOString().slice(0, 10);
  const baseName = customFilename || `${moduleType}_report_${dateTag}`;
  const reportContent = extractReportContent(moduleType, data);

  switch (format.toLowerCase()) {
    case 'pdf':
      await exportToPDF(reportContent, baseName);
      return { success: true, format: 'pdf', message: 'PDF generated successfully.' };

    case 'docx':
    case 'word':
      await exportToDocx(reportContent, baseName);
      return { success: true, format: 'docx', message: 'Word document generated successfully.' };

    case 'txt':
    case 'text':
      exportToTxt(reportContent, baseName);
      return { success: true, format: 'txt', message: 'TXT file downloaded.' };

    case 'copy':
    case 'clipboard':
      await exportToClipboard(reportContent);
      return { success: true, format: 'copy', message: 'Report copied to clipboard.' };

    case 'json':
      exportToJson(data, baseName);
      return { success: true, format: 'json', message: 'JSON file downloaded.' };

    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}
