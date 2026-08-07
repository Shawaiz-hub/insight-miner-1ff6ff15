import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { ForecastResult } from "@/lib/forecastEngine";

const slug = (name: string) => name.replace(/\.[^.]+$/, "").replace(/[^a-z0-9-_]+/gi, "_").slice(0, 40) || "forecast";

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const tableRows = (result: ForecastResult) =>
  result.rows.map((r) => [
    r.date,
    r.actual ?? "",
    r.forecast === null ? "" : Number(r.forecast.toFixed(4)),
    r.lower === null ? "" : Number(r.lower.toFixed(4)),
    r.upper === null ? "" : Number(r.upper.toFixed(4)),
  ]);

const HEAD = ["Date", "Actual", "Forecast", "Lower Bound", "Upper Bound"];

export function exportForecastCsv(result: ForecastResult, datasetName: string) {
  const csv = [HEAD.join(","), ...tableRows(result).map((r) => r.join(","))].join("\n");
  download(new Blob([csv], { type: "text/csv;charset=utf-8" }), `${slug(datasetName)}_forecast.csv`);
}

export function exportForecastExcel(result: ForecastResult, datasetName: string) {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([HEAD, ...tableRows(result)]), "Forecast");
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(result.scores.map((s) => ({
      Model: s.label, RMSE: s.rmse, MAE: s.mae, MAPE: s.mape, R2: s.r2, Accuracy: s.accuracy,
    }))),
    "Models",
  );
  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  download(new Blob([out], { type: "application/octet-stream" }), `${slug(datasetName)}_forecast.xlsx`);
}

export function exportForecastJson(result: ForecastResult, datasetName: string) {
  download(new Blob([JSON.stringify(result, null, 2)], { type: "application/json" }), `${slug(datasetName)}_forecast.json`);
}

export function exportForecastPdf(result: ForecastResult, datasetName: string) {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text("SmartMine Forecast Report", 14, 18);
  doc.setFontSize(10);
  doc.text(`Dataset: ${datasetName}`, 14, 26);
  doc.text(`Best model: ${result.bestModelLabel}`, 14, 32);
  doc.text(
    `Accuracy: ${result.metrics.accuracy.toFixed(1)}%  |  RMSE: ${result.metrics.rmse.toFixed(3)}  |  MAE: ${result.metrics.mae.toFixed(3)}  |  MAPE: ${result.metrics.mape.toFixed(2)}%  |  R²: ${result.metrics.r2.toFixed(3)}`,
    14,
    38,
  );
  autoTable(doc, {
    startY: 46,
    head: [["Model", "RMSE", "MAE", "MAPE", "R²", "Accuracy"]],
    body: result.scores.map((s) => [s.label, s.rmse.toFixed(3), s.mae.toFixed(3), `${s.mape.toFixed(2)}%`, s.r2.toFixed(3), `${s.accuracy.toFixed(1)}%`]),
    styles: { fontSize: 8 },
  });
  autoTable(doc, {
    head: [HEAD],
    body: tableRows(result).map((r) => r.map(String)),
    styles: { fontSize: 8 },
  });
  doc.save(`${slug(datasetName)}_forecast_report.pdf`);
}

/** Rasterises a Recharts SVG inside the given container element to a PNG download. */
export function downloadChartPng(containerId: string, title: string) {
  const container = document.getElementById(containerId);
  const svg = container?.querySelector("svg");
  if (!svg) return;
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const width = svg.clientWidth || 800;
  const height = svg.clientHeight || 400;
  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(height));
  const data = new XMLSerializer().serializeToString(clone);
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = width * 2;
    canvas.height = height * 2;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = getComputedStyle(document.body).backgroundColor || "#0b1120";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.scale(2, 2);
    ctx.drawImage(img, 0, 0);
    canvas.toBlob((blob) => {
      if (blob) download(blob, `${slug(title)}.png`);
    });
  };
  img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(data)))}`;
}
