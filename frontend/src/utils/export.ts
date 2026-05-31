import jsPDF from "jspdf";

// ── Color Palette ──────────────────────────────────────────────────────────────
const COLORS = {
  primary: [184, 134, 11] as [number, number, number],       // #b8860b  dark goldenrod
  secondary: [26, 26, 46] as [number, number, number],       // #1a1a2e
  accent: [245, 158, 11] as [number, number, number],        // #f59e0b
  white: [255, 255, 255] as [number, number, number],
  black: [0, 0, 0] as [number, number, number],
  lightGray: [245, 245, 245] as [number, number, number],
  midGray: [200, 200, 200] as [number, number, number],
  darkGray: [100, 100, 100] as [number, number, number],
  criticalRed: [220, 38, 38] as [number, number, number],
  highOrange: [234, 88, 12] as [number, number, number],
  warningYellow: [202, 138, 4] as [number, number, number],
  goodGreen: [22, 163, 74] as [number, number, number],
  tableHeaderBg: [26, 26, 46] as [number, number, number],
  tableHeaderFg: [255, 255, 255] as [number, number, number],
  tableAltRow: [252, 249, 240] as [number, number, number],
};

// ── Layout Constants ───────────────────────────────────────────────────────────
const MARGIN = 20;
const PAGE_WIDTH = 210;   // A4 mm
const PAGE_HEIGHT = 297;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Add page number footer to the current page */
function addPageNumber(doc: jsPDF, pageNum: number, totalPages: number): void {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.darkGray);
  const text = `Page ${pageNum} of ${totalPages}`;
  const textWidth = doc.getTextWidth(text);
  doc.text(text, (PAGE_WIDTH - textWidth) / 2, PAGE_HEIGHT - 10);
}

/** Draw the thin amber accent line at the top of non-cover pages */
function addTopAccentLine(doc: jsPDF): void {
  doc.setDrawColor(...COLORS.accent);
  doc.setLineWidth(0.7);
  doc.line(MARGIN, 12, PAGE_WIDTH - MARGIN, 12);
}

/** Draw a section header with an underline */
function drawSectionHeader(doc: jsPDF, title: string, y: number): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...COLORS.secondary);
  doc.text(title, MARGIN, y);

  // underline
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(0.6);
  doc.line(MARGIN, y + 2, MARGIN + doc.getTextWidth(title) + 4, y + 2);

  return y + 10;
}

/** Determine status string & color for a telemetry value */
function getParameterStatus(value: number | string): {
  label: string;
  color: [number, number, number];
} {
  const numVal = typeof value === "number" ? value : parseFloat(String(value));
  if (isNaN(numVal)) return { label: "N/A", color: COLORS.darkGray };
  if (numVal >= 80) return { label: "Good", color: COLORS.goodGreen };
  if (numVal >= 50) return { label: "Warning", color: COLORS.warningYellow };
  return { label: "Critical", color: COLORS.criticalRed };
}

/** Map severity string to a color */
function severityColor(severity: string): [number, number, number] {
  switch (severity.toLowerCase()) {
    case "critical":
      return COLORS.criticalRed;
    case "high":
      return COLORS.highOrange;
    case "medium":
    case "warning":
      return COLORS.warningYellow;
    case "low":
    case "info":
      return COLORS.goodGreen;
    default:
      return COLORS.darkGray;
  }
}

/** Format an ISO date string into a readable format */
function formatDate(dateStr?: string): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    return d.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

// ── Exported Function ──────────────────────────────────────────────────────────

export const exportAnalyticalReport = (data: {
  regions: Array<{
    region_id: number;
    name: string;
    code?: string;
    overall_score?: number;
    risk_level?: string;
  }>;
  selectedRegion: {
    region_id: number;
    name: string;
    code?: string;
    overall_score?: number;
    risk_level?: string;
  } | null;
  telemetry: Array<{
    parameter_id: number;
    code: string;
    name: string;
    value: number | string;
    unit: string;
  }>;
  alerts: Array<{
    alert_id: number;
    severity: string;
    message: string;
    created_at?: string;
  }>;
  stabilityData: Array<any>;
  activeLayers: string[];
}): void => {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const totalPages = 4;

  const now = new Date();
  const reportDate = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const reportTime = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const regionLabel = data.selectedRegion
    ? data.selectedRegion.name
    : "All Regions";
  const healthScore =
    data.selectedRegion?.overall_score != null
      ? `${data.selectedRegion.overall_score}%`
      : "N/A";

  // ╔═══════════════════════════════════════════════════════════════════════════╗
  // ║  PAGE 1 — COVER PAGE                                                    ║
  // ╚═══════════════════════════════════════════════════════════════════════════╝

  // Background band at top
  doc.setFillColor(...COLORS.secondary);
  doc.rect(0, 0, PAGE_WIDTH, 100, "F");

  // Accent stripe
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 100, PAGE_WIDTH, 3, "F");

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.setTextColor(...COLORS.white);
  doc.text("GeoEnv-IP Environmental", PAGE_WIDTH / 2, 42, { align: "center" });
  doc.text("Analysis Report", PAGE_WIDTH / 2, 54, { align: "center" });

  // Subtitle
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.accent);
  doc.text(
    "Geo-Environmental Intelligence Platform \u2014 Analytical Summary",
    PAGE_WIDTH / 2,
    68,
    { align: "center" }
  );

  // Date & time
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.lightGray);
  doc.text(`${reportDate}  |  ${reportTime}`, PAGE_WIDTH / 2, 82, {
    align: "center",
  });

  // Region label
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.lightGray);
  doc.text(`Region: ${regionLabel}`, PAGE_WIDTH / 2, 92, { align: "center" });

  // Horizontal separator below the band
  doc.setDrawColor(...COLORS.midGray);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, 115, PAGE_WIDTH - MARGIN, 115);

  // Summary stats section
  let y = 130;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...COLORS.secondary);
  doc.text("Report Summary", MARGIN, y);
  y += 12;

  const stats = [
    { label: "Total Regions Monitored", value: String(data.regions.length) },
    { label: "Active Alerts", value: String(data.alerts.length) },
    { label: "Overall Health Score", value: healthScore },
  ];

  for (const stat of stats) {
    // Stat card background
    doc.setFillColor(...COLORS.lightGray);
    doc.roundedRect(MARGIN, y - 5, CONTENT_WIDTH, 14, 2, 2, "F");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.darkGray);
    doc.text(stat.label, MARGIN + 5, y + 3);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...COLORS.primary);
    doc.text(stat.value, PAGE_WIDTH - MARGIN - 5, y + 3, { align: "right" });

    y += 18;
  }

  // Footer branding
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.darkGray);
  doc.text(
    "Generated by GeoEnv-IP \u2022 Confidential",
    PAGE_WIDTH / 2,
    PAGE_HEIGHT - 20,
    { align: "center" }
  );

  addPageNumber(doc, 1, totalPages);

  // ╔═══════════════════════════════════════════════════════════════════════════╗
  // ║  PAGE 2 — TELEMETRY ANALYSIS                                            ║
  // ╚═══════════════════════════════════════════════════════════════════════════╝
  doc.addPage();
  addTopAccentLine(doc);

  y = drawSectionHeader(doc, "Telemetry Parameter Analysis", 24);
  y += 4;

  // Table column layout
  const colX = {
    name: MARGIN,
    value: MARGIN + 80,
    status: MARGIN + 140,
  };
  const rowHeight = 9;

  // Table header
  doc.setFillColor(...COLORS.tableHeaderBg);
  doc.rect(MARGIN, y - 5, CONTENT_WIDTH, rowHeight, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.tableHeaderFg);
  doc.text("Parameter Name", colX.name + 3, y + 1);
  doc.text("Current Value", colX.value + 3, y + 1);
  doc.text("Status", colX.status + 3, y + 1);
  y += rowHeight;

  let goodCount = 0;
  let attentionCount = 0;

  // Table rows
  const telemetryItems = data.telemetry.length > 0 ? data.telemetry : [];
  for (let i = 0; i < telemetryItems.length; i++) {
    const item = telemetryItems[i];
    const status = getParameterStatus(item.value);

    if (status.label === "Good") goodCount++;
    else attentionCount++;

    // Check if we need a new page
    if (y + rowHeight > PAGE_HEIGHT - 30) {
      addPageNumber(doc, 2, totalPages);
      doc.addPage();
      addTopAccentLine(doc);
      y = 24;
    }

    // Alternating row background
    if (i % 2 === 0) {
      doc.setFillColor(...COLORS.tableAltRow);
      doc.rect(MARGIN, y - 5, CONTENT_WIDTH, rowHeight, "F");
    }

    // Row border
    doc.setDrawColor(...COLORS.midGray);
    doc.setLineWidth(0.15);
    doc.line(MARGIN, y + 4, PAGE_WIDTH - MARGIN, y + 4);

    // Name
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.black);
    doc.text(item.name, colX.name + 3, y + 1);

    // Value + Unit
    const valueStr = `${item.value} ${item.unit}`;
    doc.setTextColor(...COLORS.secondary);
    doc.text(valueStr, colX.value + 3, y + 1);

    // Status badge
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...status.color);
    doc.text(status.label, colX.status + 3, y + 1);

    y += rowHeight;
  }

  if (telemetryItems.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.darkGray);
    doc.text("No telemetry data available for the selected region.", MARGIN, y + 4);
    y += 12;
  }

  // Analysis summary paragraph
  y += 10;
  if (y > PAGE_HEIGHT - 50) {
    addPageNumber(doc, 2, totalPages);
    doc.addPage();
    addTopAccentLine(doc);
    y = 24;
  }

  doc.setFillColor(...COLORS.lightGray);
  doc.roundedRect(MARGIN, y - 4, CONTENT_WIDTH, 24, 2, 2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.secondary);
  doc.text("Analysis Summary", MARGIN + 4, y + 3);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.darkGray);
  const summaryText =
    `The selected region shows ${goodCount} parameter${goodCount !== 1 ? "s" : ""} within normal operational thresholds. ` +
    `${attentionCount} parameter${attentionCount !== 1 ? "s" : ""} require${attentionCount === 1 ? "s" : ""} monitoring attention.`;
  const summaryLines = doc.splitTextToSize(summaryText, CONTENT_WIDTH - 8);
  doc.text(summaryLines, MARGIN + 4, y + 11);

  addPageNumber(doc, 2, totalPages);

  // ╔═══════════════════════════════════════════════════════════════════════════╗
  // ║  PAGE 3 — ALERT LOG                                                     ║
  // ╚═══════════════════════════════════════════════════════════════════════════╝
  doc.addPage();
  addTopAccentLine(doc);

  y = drawSectionHeader(doc, "Active Threat & Alert Log", 24);
  y += 4;

  // Alert table columns
  const alertColX = {
    severity: MARGIN,
    message: MARGIN + 30,
    timestamp: MARGIN + 130,
  };

  // Table header
  doc.setFillColor(...COLORS.tableHeaderBg);
  doc.rect(MARGIN, y - 5, CONTENT_WIDTH, rowHeight, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.tableHeaderFg);
  doc.text("Severity", alertColX.severity + 3, y + 1);
  doc.text("Message", alertColX.message + 3, y + 1);
  doc.text("Timestamp", alertColX.timestamp + 3, y + 1);
  y += rowHeight;

  // Severity counters
  const sevCounts: Record<string, number> = {};

  const alertItems = data.alerts.length > 0 ? data.alerts : [];
  for (let i = 0; i < alertItems.length; i++) {
    const alert = alertItems[i];
    const sevKey = alert.severity.toLowerCase();
    sevCounts[sevKey] = (sevCounts[sevKey] || 0) + 1;

    // Check page overflow
    if (y + rowHeight > PAGE_HEIGHT - 40) {
      addPageNumber(doc, 3, totalPages);
      doc.addPage();
      addTopAccentLine(doc);
      y = 24;
    }

    // Alternating row background
    if (i % 2 === 0) {
      doc.setFillColor(...COLORS.tableAltRow);
      doc.rect(MARGIN, y - 5, CONTENT_WIDTH, rowHeight, "F");
    }

    doc.setDrawColor(...COLORS.midGray);
    doc.setLineWidth(0.15);
    doc.line(MARGIN, y + 4, PAGE_WIDTH - MARGIN, y + 4);

    // Severity — color-coded
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...severityColor(alert.severity));
    doc.text(alert.severity.toUpperCase(), alertColX.severity + 3, y + 1);

    // Message (truncate to fit)
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.black);
    const maxMsgWidth = alertColX.timestamp - alertColX.message - 6;
    let msg = alert.message;
    while (doc.getTextWidth(msg) > maxMsgWidth && msg.length > 0) {
      msg = msg.slice(0, -1);
    }
    if (msg.length < alert.message.length) msg = msg.slice(0, -3) + "...";
    doc.text(msg, alertColX.message + 3, y + 1);

    // Timestamp
    doc.setTextColor(...COLORS.darkGray);
    doc.text(formatDate(alert.created_at), alertColX.timestamp + 3, y + 1);

    y += rowHeight;
  }

  if (alertItems.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.goodGreen);
    doc.text("No active alerts — all systems operational.", MARGIN, y + 4);
    y += 12;
  }

  // Severity summary
  y += 10;
  if (y > PAGE_HEIGHT - 40) {
    addPageNumber(doc, 3, totalPages);
    doc.addPage();
    addTopAccentLine(doc);
    y = 24;
  }

  doc.setFillColor(...COLORS.lightGray);
  const sevEntries = Object.entries(sevCounts);
  const summaryBoxHeight = Math.max(20, 10 + sevEntries.length * 6 + 4);
  doc.roundedRect(MARGIN, y - 4, CONTENT_WIDTH, summaryBoxHeight, 2, 2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.secondary);
  doc.text("Alert Summary", MARGIN + 4, y + 3);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  let sY = y + 11;
  if (sevEntries.length === 0) {
    doc.setTextColor(...COLORS.darkGray);
    doc.text("No alerts recorded.", MARGIN + 4, sY);
  } else {
    doc.setTextColor(...COLORS.darkGray);
    doc.text(`Total Alerts: ${data.alerts.length}`, MARGIN + 4, sY);
    sY += 6;
    for (const [sev, count] of sevEntries) {
      doc.setTextColor(...severityColor(sev));
      doc.text(
        `• ${sev.charAt(0).toUpperCase() + sev.slice(1)}: ${count}`,
        MARGIN + 8,
        sY
      );
      sY += 6;
    }
  }

  addPageNumber(doc, 3, totalPages);

  // ╔═══════════════════════════════════════════════════════════════════════════╗
  // ║  PAGE 4 — REGIONAL HEALTH OVERVIEW                                      ║
  // ╚═══════════════════════════════════════════════════════════════════════════╝
  doc.addPage();
  addTopAccentLine(doc);

  y = drawSectionHeader(doc, "Regional Health Scores", 24);
  y += 6;

  const barMaxWidth = CONTENT_WIDTH - 60;  // space for labels + percentage
  const barHeight = 8;
  const barSpacing = 16;

  const regionItems = data.regions.length > 0 ? data.regions : [];
  for (let i = 0; i < regionItems.length; i++) {
    const region = regionItems[i];
    const score = region.overall_score ?? 0;
    const riskLevel = region.risk_level ?? (score >= 85 ? "Low" : score >= 70 ? "Moderate" : score >= 55 ? "High" : "Extreme");

    // Check page overflow
    if (y + barSpacing + 6 > PAGE_HEIGHT - 30) {
      addPageNumber(doc, 4, totalPages);
      doc.addPage();
      addTopAccentLine(doc);
      y = 24;
    }

    // Region name
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.secondary);
    doc.text(region.name, MARGIN, y);

    // Risk level badge
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...severityColor(riskLevel));
    doc.text(`(${riskLevel})`, MARGIN + doc.getTextWidth(region.name) + 3, y);

    y += 4;

    // Bar background
    doc.setFillColor(...COLORS.midGray);
    doc.roundedRect(MARGIN, y - 2, barMaxWidth, barHeight, 1.5, 1.5, "F");

    // Bar fill — color based on score
    const fillWidth = (score / 100) * barMaxWidth;
    let barColor: [number, number, number];
    if (score >= 80) barColor = COLORS.goodGreen;
    else if (score >= 50) barColor = COLORS.warningYellow;
    else barColor = COLORS.criticalRed;

    if (fillWidth > 0) {
      doc.setFillColor(...barColor);
      doc.roundedRect(MARGIN, y - 2, fillWidth, barHeight, 1.5, 1.5, "F");
    }

    // Percentage label
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.secondary);
    doc.text(`${score}%`, MARGIN + barMaxWidth + 4, y + 4);

    y += barSpacing;
  }

  if (regionItems.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.darkGray);
    doc.text("No regional data available.", MARGIN, y + 4);
  }

  addPageNumber(doc, 4, totalPages);

  // ── Save ─────────────────────────────────────────────────────────────────────
  const fileName = `GeoEnv-IP_Report_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}.pdf`;
  doc.save(fileName);
};
