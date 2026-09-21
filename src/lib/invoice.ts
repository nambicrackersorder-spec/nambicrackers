import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { SHOP } from "@/config";
import { getSettings } from "@/lib/catalog-store";

export type InvoiceLine = {
  name: string;
  unit: string;
  qty: number;
  price: number;
  rate: number;
};

export type InvoiceData = {
  orderId: string;
  date: string;
  name: string;
  mobile: string;
  email: string;
  address: string;
  city?: string;
  district: string;
  state: string;
  pincode: string;
  lines: InvoiceLine[];
  mrpTotal: number;
  discount: number;
  netTotal: number;
  totalQty: number;
};

let logoCache: string | null = null;

async function getLogo(): Promise<string | null> {
  if (logoCache !== null) return logoCache;
  try {
    const res = await fetch("/logo.png");
    const blob = await res.blob();
    logoCache = await new Promise<string>((resolve) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result));
      fr.readAsDataURL(blob);
    });
    return logoCache;
  } catch {
    return null;
  }
}

/* Brand palette */
const MAROON: [number, number, number] = [122, 20, 32];
const MAROON_DARK: [number, number, number] = [92, 14, 24];
const GOLD: [number, number, number] = [201, 162, 77];
const CREAM: [number, number, number] = [253, 250, 243];
const TEXT: [number, number, number] = [38, 32, 32];
const MUTED: [number, number, number] = [110, 102, 100];

const inr = (n: number) => `Rs ${Number(n || 0).toLocaleString("en-IN")}`;

export async function buildInvoice(data: InvoiceData): Promise<jsPDF> {
  const settings = getSettings();
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 40;
  const innerW = W - M * 2;

  /* ---------- Header ---------- */
  doc.setFillColor(...MAROON);
  doc.rect(0, 0, W, 96, "F");
  doc.setFillColor(...GOLD);
  doc.rect(0, 96, W, 3, "F");

  const logo = await getLogo();
  if (logo) doc.addImage(logo, "PNG", M, 16, 64, 64);

  const textX = M + (logo ? 78 : 0);
  doc.setTextColor(...GOLD);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text((settings.name || SHOP.name).toUpperCase(), textX, 40, { charSpace: 1.2 });

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(doc.splitTextToSize(settings.address || SHOP.address, 300), textX, 56);
  doc.text(`${settings.phoneDisplay || SHOP.phoneDisplay}   |   ${settings.email || SHOP.email}`, textX, 84);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...GOLD);
  doc.text("ORDER INVOICE", W - M, 40, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text(`Order ID: ${data.orderId}`, W - M, 58, { align: "right" });
  doc.text(`Date: ${data.date}`, W - M, 72, { align: "right" });

  /* ---------- Customer details ---------- */
  const cardY = 122;
  const left: [string, string][] = [
    ["Name", data.name],
    ["Mobile", data.mobile],
    ["Email", data.email],
    ["Delivery Address", data.address],
  ];
  const right: [string, string][] = [
    ["City", data.city || "-"],
    ["District", data.district],
    ["State", data.state],
    ["Pincode", data.pincode],
  ];

  const colW = innerW / 2;
  const rowH = 16;
  const cardH = 34 + rowH * 4 + 10;

  doc.setFillColor(...CREAM);
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.8);
  doc.roundedRect(M, cardY, innerW, cardH, 5, 5, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...MAROON);
  doc.text("CUSTOMER DETAILS", M + 14, cardY + 20, { charSpace: 0.8 });

  const drawCol = (rows: [string, string][], x: number, labelW: number) => {
    let y = cardY + 40;
    rows.forEach(([label, value]) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(...MUTED);
      doc.text(label, x, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...TEXT);
      const wrapped = doc.splitTextToSize(String(value || "-"), colW - labelW - 24);
      doc.text(wrapped[0] ?? "-", x + labelW, y);
      if (wrapped[1]) {
        doc.setFontSize(7.8);
        doc.text(wrapped.slice(1).join(" "), x + labelW, y + 9);
        doc.setFontSize(8.5);
      }
      y += rowH;
    });
  };

  drawCol(left, M + 14, 86);
  drawCol(right, M + colW + 14, 56);

  /* ---------- Items table ---------- */
  autoTable(doc, {
    startY: cardY + cardH + 18,
    margin: { left: M, right: M },
    head: [["#", "Product", "Unit", "MRP", "Offer", "Qty", "Amount"]],
    body: data.lines.map((l, i) => [
      String(i + 1),
      l.name,
      l.unit,
      `${l.rate}`,
      `${l.price}`,
      String(l.qty),
      `${l.qty * l.price}`,
    ]),
    styles: {
      fontSize: 8.5,
      cellPadding: { top: 5, bottom: 5, left: 6, right: 6 },
      lineColor: [230, 222, 208],
      lineWidth: 0.5,
      valign: "middle",
      textColor: TEXT,
    },
    headStyles: {
      fillColor: MAROON,
      textColor: GOLD,
      fontSize: 9,
      halign: "center",
      valign: "middle",
    },
    alternateRowStyles: { fillColor: CREAM },
    columnStyles: {
      0: { cellWidth: 26, halign: "center" },
      1: { cellWidth: "auto", halign: "left" },
      2: { cellWidth: 54, halign: "center" },
      3: { cellWidth: 52, halign: "right" },
      4: { cellWidth: 52, halign: "right" },
      5: { cellWidth: 40, halign: "center" },
      6: { cellWidth: 62, halign: "right" },
    },
  });

  /* ---------- Totals ---------- */
  let y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20;
  const boxW = 250;
  const boxX = W - M - boxW;
  const boxH = 100;

  if (y + boxH + 90 > H) {
    doc.addPage();
    y = 60;
  }

  doc.setFillColor(...CREAM);
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.8);
  doc.roundedRect(boxX, y, boxW, boxH, 5, 5, "FD");

  const lx = boxX + 16;
  const rx = boxX + boxW - 16;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...MUTED);
  doc.text("Total Items", lx, y + 22);
  doc.setTextColor(...TEXT);
  doc.text(String(data.totalQty), rx, y + 22, { align: "right" });

  doc.setTextColor(...MUTED);
  doc.text("Subtotal", lx, y + 40);
  doc.setTextColor(...TEXT);
  doc.text(inr(data.mrpTotal), rx, y + 40, { align: "right" });

  doc.setTextColor(...MUTED);
  doc.text("Discount", lx, y + 58);
  doc.setTextColor(...TEXT);
  doc.text(`- ${inr(data.discount)}`, rx, y + 58, { align: "right" });

  /* Total band */
  doc.setFillColor(...MAROON);
  doc.rect(boxX + 1, y + 68, boxW - 2, 31, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11.5);
  doc.setTextColor(...GOLD);
  doc.text("TOTAL", lx, y + 88, { charSpace: 0.8 });
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text(inr(data.netTotal), rx, y + 88, { align: "right" });

  /* ---------- Closing ---------- */
  let cy = y + boxH + 46;

  /* Ensure closing block fits on the page */
  if (cy + 120 > H) {
    doc.addPage();
    cy = 60;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...MAROON_DARK);
  doc.text("Thanking You!", W / 2, cy, { align: "center" });

  doc.setFontSize(11);
  doc.setTextColor(...MAROON);
  doc.text((settings.name || SHOP.name).toUpperCase(), W / 2, cy + 20, { align: "center", charSpace: 1 });

  doc.setDrawColor(...GOLD);
  doc.setLineWidth(1);
  doc.line(W / 2 - 60, cy + 30, W / 2 + 60, cy + 30);

  /* ---------- Diwali wish ---------- */
  const wishY = cy + 52;
  doc.setFont("helvetica", "bolditalic");
  doc.setFontSize(10);
  doc.setTextColor(...MAROON);
  doc.text(
    "Wishing you and your family a Happy Diwali filled with joy, light, and safe celebrations!",
    W / 2,
    wishY,
    { align: "center" },
  );

  return doc;
}

export async function invoiceBase64(data: InvoiceData): Promise<string> {
  const doc = await buildInvoice(data);
  const out = doc.output("datauristring");
  return out.substring(out.indexOf(",") + 1);
}

export async function downloadInvoice(data: InvoiceData) {
  const settings = getSettings();
  const doc = await buildInvoice(data);
  doc.save(`${data.orderId}-${(settings.name || SHOP.name).replace(/\s+/g, "-")}.pdf`);
}

/** Short brand order id, e.g. NC-4605 */
export function makeOrderId() {
  const n = 1000 + Math.floor(Math.random() * 9000);
  return `NC-${n}`;
}
