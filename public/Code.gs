/**
 * Nambi Crackers — Google Apps Script order receiver
 *
 * SETUP
 * 1. Open https://sheets.new and create a spreadsheet (any name).
 * 2. Extensions > Apps Script. Delete everything, paste this file, Save.
 * 3. Deploy > New deployment > type "Web app".
 *      Execute as: Me      Who has access: Anyone
 * 4. Copy the /exec URL and paste it into src/config.ts (APPS_SCRIPT_URL).
 *
 * Both doGet(e) and doPost(e) are handled. Orders are appended to the
 * "Responses" tab and the invoice PDF is emailed to the shop and customer.
 */

var SHEET_NAME = "Responses";
var SHOP_EMAIL = "thirumalainambi36@gmail.com";
var SHOP_NAME = "Nambi Crackers";

var STATUS_COL = 16; // 1-indexed column of 'Status' (last column)
var HEADERS = [
  "Timestamp",
  "Order ID",
  "Name",
  "Mobile",
  "Email",
  "Delivery Address",
  "District",
  "State",
  "Pincode",
  "Order Items",
  "Total Qty",
  "MRP Total",
  "Discount",
  "Total Amount",
  "City",
  "Status",
];

var STATUSES = ["Confirmed", "Payment Completed", "Shipped", "Delivered", "Cancelled"];

// Brand colours
var C_MAROON = "#7a1420";
var C_GOLD = "#c9a24d";
var C_CREAM = "#fffdf8";
var C_CREAM_ALT = "#faf3e3";
var STATUS_COLORS = {
  Confirmed: { bg: "#dbeafe", fg: "#1d4ed8" },
  "Payment Completed": { bg: "#e0e7ff", fg: "#4338ca" },
  Shipped: { bg: "#fef3c7", fg: "#92400e" },
  Delivered: { bg: "#dcfce7", fg: "#166534" },
  Cancelled: { bg: "#fee2e2", fg: "#991b1b" },
};

function doGet(e) {
  if (e && e.parameter && e.parameter.action === "list") {
    return listOrders_();
  }
  if (e && e.parameter && e.parameter.action === "track") {
    return trackOrders_(e.parameter.query || "");
  }
  if (e && e.parameter && e.parameter.action === "updateStatus") {
    return updateOrderStatusByRequest_(e.parameter || {});
  }
  return handleRequest(e);
}

function doPost(e) {
  if (e && e.parameter && e.parameter.action === "updateStatus") {
    return updateOrderStatusByRequest_(e.parameter || {});
  }
  if (e && e.postData && e.postData.contents) {
    try {
      var body = JSON.parse(e.postData.contents);
      if (body && body.action === "updateStatus") {
        return updateOrderStatusByRequest_(body);
      }
    } catch (ignore) {}
  }
  return handleRequest(e);
}

function handleRequest(e) {
  try {
    var params = {};

    if (e && e.parameter) {
      for (var k in e.parameter) params[k] = e.parameter[k];
    }

    if (e && e.postData && e.postData.contents) {
      try {
        var body = JSON.parse(e.postData.contents);
        for (var j in body) params[j] = body[j];
      } catch (ignore) {}
    }

    var sheet = getSheet_();

    var items = String(params.items || "")
      .split(/\s*\|\s*|\r?\n/)
      .filter(function (s) {
        return s !== "";
      })
      .join(String.fromCharCode(10));

    var orderId = uniqueOrderId_(sheet, params.orderId);

    var row = sheet.getLastRow() + 1;
    sheet.appendRow([
      new Date(),
      orderId,
      params.name || "",
      params.mobile || "",
      params.email || "",
      params.address || "",
      params.district || "",
      params.state || "",
      params.pincode || "",
      items,
      params.totalQty || "",
      params.mrpTotal || "",
      params.discountAmount || "",
      params.totalAmount || "",
      params.city || "",
      "Confirmed",
    ]);

    applyStatusValidation_(sheet, row);

    var newRow = sheet.getRange(row, 1, 1, HEADERS.length);
    newRow
      .setVerticalAlignment("top")
      .setBackground(row % 2 === 0 ? C_CREAM : C_CREAM_ALT)
      .setBorder(true, true, true, true, true, true, "#e6dcc4", SpreadsheetApp.BorderStyle.SOLID);
    sheet.getRange(row, 10).setWrap(true);
    sheet.setRowHeight(row, Math.max(21, items.split(String.fromCharCode(10)).length * 16));
    colorStatus_(sheet.getRange(row, STATUS_COL), "Confirmed");

    var mail = sendInvoiceMails_(params, orderId, items);

    return json_({
      success: true,
      orderId: orderId,
      mailSent: mail.sent,
      mailError: mail.error,
      remainingQuota: mail.quota,
    });
  } catch (err) {
    return json_({ success: false, error: String(err) });
  }
}

/** Ensures a short unique NC-#### order id. */
function uniqueOrderId_(sheet, requested) {
  var existing = {};
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    var ids = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
    for (var i = 0; i < ids.length; i++) existing[String(ids[i][0] || "")] = true;
  }
  var id = String(requested || "").trim();
  if (!id || existing[id]) {
    var guard = 0;
    do {
      id = "NC-" + Math.floor(1000 + Math.random() * 9000);
      guard++;
    } while (existing[id] && guard < 200);
  }
  return id;
}

function normalizeStatus_(rawStatus) {
  var value = String(rawStatus || "Confirmed").trim();
  if (!value) value = "Confirmed";
  var normalized = value;
  if (value.toLowerCase() === "in transit" || value.toLowerCase() === "dispatch" || value.toLowerCase() === "shipping") {
    normalized = "Shipped";
  }
  if (value.toLowerCase() === "payment pending" || value.toLowerCase() === "payment" || value.toLowerCase() === "paid") {
    normalized = "Payment Completed";
  }
  if (value.toLowerCase() === "cancelled" || value.toLowerCase() === "canceled") {
    normalized = "Cancelled";
  }
  if (STATUSES.indexOf(normalized) === -1) {
    return "Confirmed";
  }
  return normalized;
}

function getCustomerStatusMessage_(status, orderId, customerName) {
  var messages = {
    Confirmed: "Your order " + orderId + " has been confirmed and is being prepared for dispatch.",
    "Payment Completed": "We have received the payment for order " + orderId + ". We will pack and ship it shortly.",
    Shipped: "Your order " + orderId + " has been shipped and is on the way. Please keep your phone ready for delivery updates.",
    Delivered: "Your order " + orderId + " has been delivered. Thank you for shopping with Nambi Crackers.",
    Cancelled: "Your order " + orderId + " has been cancelled. Please contact us if you need any help.",
  };

  var body = messages[status] || "Your order " + orderId + " has an update: " + status + ".";
  return "Hi " + (customerName || "Customer") + ",\n\n" + body + "\n\nThank you,\nNambi Crackers";
}

function sendStatusEmail_(sheet, row) {
  try {
    var email = String(sheet.getRange(row, 5).getValue() || "").trim();
    var orderId = String(sheet.getRange(row, 2).getValue() || "").trim();
    var customerName = String(sheet.getRange(row, 3).getValue() || "Customer").trim();
    var status = normalizeStatus_(sheet.getRange(row, STATUS_COL).getValue() || "Confirmed");

    if (!email || !orderId || !status || status === "Confirmed" && !sheet.getRange(row, STATUS_COL).isBlank()) {
      return false;
    }

    var subject = "Order " + orderId + " status: " + status;
    var html =
      '<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;border:1px solid #e6dcc4;background:#fffdf8">' +
      '<div style="background:#7a1420;padding:18px 20px;text-align:center;border-bottom:3px solid #c9a24d">' +
      '<span style="color:#c9a24d;font-size:20px;font-weight:bold;letter-spacing:2px">NAMBI CRACKERS</span>' +
      '</div>' +
      '<div style="padding:22px 18px;color:#2a2222;line-height:1.7">' +
      '<p style="margin:0 0 12px">Hi <b>' + customerName + '</b>,</p>' +
      '<p style="margin:0 0 12px">Your order <b>' + orderId + '</b> is now marked as <b style="color:#7a1420">' + status + '</b>.</p>' +
      '<p style="margin:0 0 12px">' + (status === "Confirmed" ? "We have received your request and are preparing it for confirmation." : status === "Payment Completed" ? "We have received your payment and are preparing the order." : status === "Shipped" ? "Your order is on the way and will reach you soon." : status === "Delivered" ? "Your order has been delivered. Thank you for shopping with us." : "Your order has been cancelled. Please contact us if you need help.") + '</p>' +
      '<p style="margin:0;text-align:center;color:#7a1420;font-weight:bold">Thank You</p>' +
      '<p style="margin:4px 0 0;text-align:center;color:#7a1420;letter-spacing:1.2px;font-weight:bold">NAMBI CRACKERS</p>' +
      '</div></div>';

    GmailApp.sendEmail(email, subject, getCustomerStatusMessage_(status, orderId, customerName), {
      htmlBody: html,
      name: SHOP_NAME,
    });
    return true;
  } catch (err) {
    return false;
  }
}

function updateOrderStatusByRequest_(params) {
  try {
    var orderId = String(params.orderId || params.id || "").trim();
    var status = normalizeStatus_(params.status || "Confirmed");
    var sheet = getSheet_();

    if (!orderId) {
      return json_({ success: false, error: "Missing orderId" });
    }

    var lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      return json_({ success: false, error: "No orders found" });
    }

    var found = false;
    for (var r = 2; r <= lastRow; r++) {
      if (String(sheet.getRange(r, 2).getValue() || "") === orderId) {
        var currentStatus = String(sheet.getRange(r, STATUS_COL).getValue() || "Confirmed");
        if (normalizeStatus_(currentStatus) !== status) {
          sheet.getRange(r, STATUS_COL).setValue(status);
          colorStatus_(sheet.getRange(r, STATUS_COL), status);
          sendStatusEmail_(sheet, r);
        }
        found = true;
        break;
      }
    }

    return json_({ success: found, orderId: orderId, status: status, updated: found });
  } catch (err) {
    return json_({ success: false, error: String(err) });
  }
}

function sendInvoiceMails_(params, orderId, items) {
  var result = { sent: false, error: "", quota: -1 };
  try {
    result.quota = MailApp.getRemainingDailyQuota();

    var attachments = [];
    if (params.pdf) {
      try {
        var clean = String(params.pdf)
          .replace(/^data:[^,]*,/, "")
          .replace(/\s/g, "");
        attachments.push(
          Utilities.newBlob(
            Utilities.base64Decode(clean),
            "application/pdf",
            orderId + "-invoice.pdf",
          ),
        );
      } catch (pdfErr) {
        result.error += "pdf: " + pdfErr + "; ";
      }
    }

    var html =
      '<div style="font-family:Georgia,Arial,sans-serif;max-width:560px;margin:0 auto;' +
      'background:#fffdf8;border:1px solid #e6dcc4">' +
      '<div style="background:#7a1420;padding:18px 20px;text-align:center;border-bottom:3px solid #c9a24d">' +
      '<span style="color:#c9a24d;font-size:20px;font-weight:bold;letter-spacing:2px">NAMBI CRACKERS</span>' +
      "</div>" +
      '<div style="padding:22px 24px;color:#2a2222;font-size:14px;line-height:1.7">' +
      '<p style="margin:0 0 14px">Thank you for your order enquiry.</p>' +
      '<p style="margin:0 0 4px;color:#6e6664;font-size:13px">Order ID: <b style="color:#7a1420">' +
      orderId +
      "</b></p>" +
      '<p style="margin:0 0 16px;color:#6e6664;font-size:13px">Customer: <b style="color:#2a2222">' +
      (params.name || "") +
      "</b></p>" +
      '<p style="margin:0 0 12px">Your order enquiry has been received successfully. ' +
      "Our team will contact you to confirm the order, packing and delivery.</p>" +
      '<p style="margin:0 0 20px">Please refer to the attached PDF for complete order details.</p>' +
      '<p style="margin:0;text-align:center;color:#7a1420;font-weight:bold">Thanking You!</p>' +
      '<p style="margin:4px 0 0;text-align:center;color:#7a1420;letter-spacing:1.5px;font-weight:bold">' +
      "NAMBI CRACKERS</p>" +
      "</div></div>";

    var shopOk = send_(
      SHOP_EMAIL,
      "New Order " + orderId + " - " + (params.name || ""),
      html,
      attachments,
      result,
    );

    var custOk = true;
    if (params.email) {
      custOk = send_(
        params.email,
        SHOP_NAME + " - Order " + orderId + " received",
        html,
        attachments,
        result,
      );
    }

    result.sent = shopOk && custOk;
  } catch (mailErr) {
    // mailing must never break the order save
    result.error += String(mailErr);
  }
  return result;
}

/** Tries GmailApp first (supports attachments + replyTo), falls back to MailApp. */
function send_(to, subject, html, attachments, result) {
  try {
    GmailApp.sendEmail(to, subject, html.replace(/<[^>]+>/g, " "), {
      htmlBody: html,
      name: SHOP_NAME,
      attachments: attachments,
    });
    return true;
  } catch (e1) {
    try {
      MailApp.sendEmail({
        to: to,
        subject: subject,
        htmlBody: html,
        name: SHOP_NAME,
        attachments: attachments,
      });
      return true;
    } catch (e2) {
      result.error += to + ": " + e2 + "; ";
      return false;
    }
  }
}

function trackOrders_(query) {
  try {
    var q = String(query || "")
      .trim()
      .toLowerCase();
    if (!q) return json_({ success: true, orders: [] });

    var sheet = getSheet_();
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return json_({ success: true, orders: [] });

    var values = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
    var orders = [];
    for (var i = values.length - 1; i >= 0; i--) {
      var r = values[i];
      var orderId = String(r[1] || "").toLowerCase();
      var mobile = String(r[3] || "").replace(/\D/g, "");
      if (orderId !== q && mobile !== q.replace(/\D/g, "")) continue;
      orders.push({
        orderId: String(r[1] || ""),
        name: String(r[2] || ""),
        timestamp: r[0]
          ? Utilities.formatDate(new Date(r[0]), "Asia/Kolkata", "dd MMM yyyy, hh:mm a")
          : "",
        items: String(r[9] || ""),
        totalQty: String(r[10] || ""),
        totalAmount: String(r[13] || ""),
        status: String(r[15] || "Confirmed"),
      });
    }
    return json_({ success: true, orders: orders });
  } catch (err) {
    return json_({ success: false, error: String(err) });
  }
}

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
  }

  // One-time migration: old layout had Status at col 15, City at col 16.
  // Move the whole Status column to the last position.
  var hv = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), HEADERS.length)).getValues()[0];
  if (String(hv[14] || "") === "Status" && String(hv[15] || "") === "City") {
    var maxRows = sheet.getMaxRows();
    sheet.getRange(1, 15, maxRows, 1).moveTo(sheet.getRange(1, 17, maxRows, 1));
    sheet.deleteColumn(15);
    hv = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), HEADERS.length)).getValues()[0];
  }

  // Ensure Status header exists at the last column
  if (String(hv[STATUS_COL - 1] || "") !== "Status") {
    sheet.getRange(1, STATUS_COL).setValue("Status");
  }

  // Professional header: maroon background, white bold text, gold underline
  sheet
    .getRange(1, 1, 1, HEADERS.length)
    .setFontWeight("bold")
    .setFontColor("#ffffff")
    .setBackground(C_MAROON)
    .setHorizontalAlignment("center")
    .setBorder(
      false,
      false,
      true,
      false,
      false,
      false,
      C_GOLD,
      SpreadsheetApp.BorderStyle.SOLID_MEDIUM,
    );

  // Colour the status cells of existing rows
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    var statusVals = sheet.getRange(2, STATUS_COL, lastRow - 1, 1).getValues();
    for (var i = 0; i < statusVals.length; i++) {
      colorStatus_(sheet.getRange(i + 2, STATUS_COL), String(statusVals[i][0] || "Confirmed"));
    }
  }

  if (sheet.getColumnWidth(10) < 200) {
    sheet.setColumnWidth(10, 320);
  }

  return sheet;
}

/** Colours a status cell based on its value. */
function colorStatus_(range, value) {
  var c = STATUS_COLORS[value] || STATUS_COLORS["Confirmed"];
  if (!value) value = "Confirmed";
  range
    .setValue(value)
    .setBackground(c.bg)
    .setFontColor(c.fg)
    .setFontWeight("bold")
    .setHorizontalAlignment("center");
}

/** Simple trigger: recolour the Status cell when you change it in the sheet. */
function onEdit(e) {
  try {
    var range = e.range;
    var sheet = range.getSheet();
    if (sheet.getName() !== SHEET_NAME) return;
    if (range.getColumn() === STATUS_COL && range.getRow() > 1) {
      var oldValue = String(e.oldValue || "");
      var newValue = normalizeStatus_(String(range.getValue() || "Confirmed"));
      range.setValue(newValue);
      colorStatus_(range, newValue);

      if (oldValue && oldValue !== newValue) {
        sendStatusEmail_(sheet, range.getRow());
      }
    }
  } catch (ignore) {}
}

function listOrders_() {
  try {
    var sheet = getSheet_();
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return json_({ success: true, orders: [] });

    var values = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
    var orders = [];
    for (var i = values.length - 1; i >= 0; i--) {
      var r = values[i];
      orders.push({
        timestamp: r[0]
          ? Utilities.formatDate(new Date(r[0]), "Asia/Kolkata", "dd MMM yyyy, hh:mm a")
          : "",
        orderId: String(r[1] || ""),
        name: String(r[2] || ""),
        mobile: String(r[3] || ""),
        email: String(r[4] || ""),
        address: String(r[5] || ""),
        district: String(r[6] || ""),
        state: String(r[7] || ""),
        pincode: String(r[8] || ""),
        items: String(r[9] || ""),
        totalQty: String(r[10] || ""),
        totalAmount: String(r[13] || ""),
        status: String(r[15] || "Confirmed"),
      });
    }
    return json_({ success: true, orders: orders });
  } catch (err) {
    return json_({ success: false, error: String(err) });
  }
}

function applyStatusValidation_(sheet, row) {
  var rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(STATUSES, true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(row, STATUS_COL).setDataValidation(rule);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
