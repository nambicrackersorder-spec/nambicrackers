/**
 * Nambi Crackers — Google Apps Script Backend & Order Receiver
 *
 * SPREADSHEET TABS:
 * 1. "Responses"  - Customer order submissions, tracking, and statuses
 * 2. "Products"   - Persistent source of truth for all products & images
 * 3. "Categories" - Persistent source of truth for product categories
 * 4. "Settings"   - Persistent source of truth for shop configuration
 *
 * API ACTIONS HANDLED:
 * - doGet:
 *     ?action=catalog         -> Returns full categorized catalog & shop settings
 *     ?action=settings        -> Returns shop settings
 *     ?action=list            -> Returns orders list for Admin
 *     ?action=track           -> Returns customer order tracking info
 *     ?action=updateStatus    -> Updates order status and sends email
 *     ?action=verifyCatalog   -> Verifies Products & Categories sheets integrity
 *     ?action=migrateCatalog  -> Explicit catalog migration trigger
 * - doPost:
 *     action="saveCatalog"    -> Atomic batch save of all categories & products to Sheets
 *     action="saveSettings"   -> Saves shop settings to Settings Sheet & Script Properties
 *     action="addProduct"     -> Adds a single product to Products Sheet
 *     action="updateProduct"  -> Updates a single product in Products Sheet
 *     action="deleteProduct"  -> Deletes a product from Products Sheet
 *     action="toggleProductActive" -> Toggles product active state in Products Sheet
 *     action="reorderProduct" -> Reorders product display order in Products Sheet
 *     action="addCategory"    -> Adds a category to Categories Sheet
 *     action="updateCategory" -> Updates category in Categories Sheet
 *     action="deleteCategory" -> Deletes category from Categories Sheet
 *     action="reorderCategory"-> Reorders categories in Categories Sheet
 *     action="updateStatus"   -> Updates order status
 *     default                 -> Handles customer order placement
 */

var SHEET_NAME = "Responses";
var PRODUCTS_SHEET_NAME = "Products";
var CATEGORIES_SHEET_NAME = "Categories";
var SETTINGS_SHEET_NAME = "Settings";
var CATALOG_STORE_SHEET_NAME = "Catalog_Store";

var SHOP_EMAIL = "thirumalainambi36@gmail.com";
var SHOP_NAME = "Nambi Crackers";

var STATUS_COL = 16; // 1-indexed column of 'Status' (last column) in Responses sheet
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

var PRODUCT_HEADERS = [
  "Product ID",
  "Category",
  "Name",
  "Tamil Name",
  "MRP",
  "Offer Price",
  "Unit",
  "Image",
  "Image Part 2",
  "Image Part 3",
  "Image Part 4",
  "Show Image",
  "Active",
  "Case Only",
  "Case Quantity",
  "Case Value",
  "Case Discount",
  "Case Price",
  "Has Custom Price",
  "Display Order",
  "Slug",
  "Is Demo",
  "Extra Metadata",
];

var CATEGORY_HEADERS = [
  "Category ID",
  "Name",
  "Tamil Name",
  "Active",
  "Hide Images",
  "Price Is Final",
  "Display Order",
  "Is Demo",
  "Extra Metadata",
];

var SETTINGS_HEADERS = ["Setting Key", "Setting Value", "Last Updated"];

var STATUSES = ["Order Confirmed", "Payment Completed", "Packaging Finished", "Shipped", "Delivered", "Cancelled"];

// Brand colours
var C_MAROON = "#7a1420";
var C_GOLD = "#c9a24d";
var C_CREAM = "#fffdf8";
var C_CREAM_ALT = "#faf3e3";
var STATUS_COLORS = {
  "Order Confirmed": { bg: "#dbeafe", fg: "#1d4ed8" },
  "Payment Completed": { bg: "#e0e7ff", fg: "#4338ca" },
  "Packaging Finished": { bg: "#e0e7ff", fg: "#4338ca" },
  Shipped: { bg: "#fef3c7", fg: "#92400e" },
  Delivered: { bg: "#dcfce7", fg: "#166534" },
  Cancelled: { bg: "#fee2e2", fg: "#991b1b" },
};

/* =========================================================================
   REQUEST ROUTERS (doGet & doPost)
   ========================================================================= */

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || "";

  if (action === "catalog") {
    return getCatalog_();
  }
  if (action === "settings" || action === "getSettings") {
    return getSettings_();
  }
  if (action === "list") {
    return listOrders_();
  }
  if (action === "track") {
    return trackOrders_(e.parameter.query || "");
  }
  if (action === "updateStatus") {
    return updateOrderStatusByRequest_(e.parameter || {});
  }
  if (action === "verifyCatalog") {
    return verifyCatalogEndpoint_();
  }
  if (action === "migrateCatalog") {
    return migrateCatalogEndpoint_();
  }
  return handleRequest(e);
}

function doPost(e) {
  var action = (e && e.parameter && e.parameter.action) || "";
  var body = {};

  if (e && e.postData && e.postData.contents) {
    try {
      body = JSON.parse(e.postData.contents);
      if (!action && body && body.action) {
        action = body.action;
      }
    } catch (ignore) {
      body = {};
    }
  }

  if (action === "saveCatalog") {
    var rawCatalog = (e && e.parameter && e.parameter.catalog) || body.catalog || body;
    return saveCatalog_(rawCatalog);
  }
  if (action === "saveSettings") {
    var rawSettings = (e && e.parameter && e.parameter.settings) || body.settings || body;
    return saveSettings_(rawSettings);
  }
  if (action === "addProduct") {
    return addProductEndpoint_(e ? e.parameter : {}, body);
  }
  if (action === "updateProduct") {
    return updateProductEndpoint_(e ? e.parameter : {}, body);
  }
  if (action === "deleteProduct") {
    return deleteProductEndpoint_(e ? e.parameter : {}, body);
  }
  if (action === "toggleProductActive") {
    return toggleProductActiveEndpoint_(e ? e.parameter : {}, body);
  }
  if (action === "reorderProduct") {
    return reorderProductEndpoint_(e ? e.parameter : {}, body);
  }
  if (action === "addCategory") {
    return addCategoryEndpoint_(e ? e.parameter : {}, body);
  }
  if (action === "updateCategory") {
    return updateCategoryEndpoint_(e ? e.parameter : {}, body);
  }
  if (action === "deleteCategory") {
    return deleteCategoryEndpoint_(e ? e.parameter : {}, body);
  }
  if (action === "reorderCategory") {
    return reorderCategoryEndpoint_(e ? e.parameter : {}, body);
  }
  if (action === "updateStatus") {
    return updateOrderStatusByRequest_(e && e.parameter ? e.parameter : body);
  }

  return handleRequest(e);
}

/* =========================================================================
   SHEET INITIALIZERS & ACCESSORS
   ========================================================================= */

function getProductsSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(PRODUCTS_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(PRODUCTS_SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(PRODUCT_HEADERS);
    sheet.setFrozenRows(1);
    formatHeaderRow_(sheet, PRODUCT_HEADERS.length);
  }
  return sheet;
}

function getCategoriesSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CATEGORIES_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(CATEGORIES_SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(CATEGORY_HEADERS);
    sheet.setFrozenRows(1);
    formatHeaderRow_(sheet, CATEGORY_HEADERS.length);
  }
  return sheet;
}

function getSettingsSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SETTINGS_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SETTINGS_SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(SETTINGS_HEADERS);
    sheet.setFrozenRows(1);
    formatHeaderRow_(sheet, SETTINGS_HEADERS.length);
  }
  return sheet;
}

function formatHeaderRow_(sheet, numCols) {
  try {
    sheet
      .getRange(1, 1, 1, numCols)
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
  } catch (ignore) {}
}

/* =========================================================================
   SETTINGS STORAGE (Settings Sheet + Script Properties fast cache)
   ========================================================================= */

function getSavedSettings_() {
  // 1. Try fast Script Properties
  try {
    var properties = PropertiesService.getScriptProperties();
    var raw = properties.getProperty("SHOP_SETTINGS");
    if (raw) {
      var parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        return parsed;
      }
    }
  } catch (errProps) {}

  // 2. Try Settings Sheet
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SETTINGS_SHEET_NAME);
    if (sheet && sheet.getLastRow() > 1) {
      var values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getValues();
      for (var i = 0; i < values.length; i++) {
        if (String(values[i][0] || "").trim() === "SHOP_SETTINGS") {
          var val = String(values[i][1] || "");
          if (val) {
            return JSON.parse(val);
          }
        }
      }
    }
  } catch (errSheet) {}

  return null;
}

function getSettings_() {
  try {
    var settings = getSavedSettings_();
    return json_({ success: true, settings: settings });
  } catch (err) {
    return json_({ success: false, error: String(err) });
  }
}

function saveSettings_(rawSettings) {
  try {
    var parsed = typeof rawSettings === "object" ? rawSettings : JSON.parse(String(rawSettings || "{}"));
    if (!parsed || typeof parsed !== "object") {
      return json_({ success: false, error: "Invalid settings object" });
    }

    var serialized = JSON.stringify(parsed);

    // 1. Save to Settings sheet
    try {
      var sheet = getSettingsSheet_();
      var lastRow = sheet.getLastRow();
      var foundRow = -1;
      if (lastRow > 1) {
        var keys = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
        for (var i = 0; i < keys.length; i++) {
          if (String(keys[i][0] || "").trim() === "SHOP_SETTINGS") {
            foundRow = i + 2;
            break;
          }
        }
      }

      var nowFormatted = Utilities.formatDate(new Date(), "Asia/Kolkata", "dd MMM yyyy, hh:mm:ss a");
      if (foundRow > 0) {
        sheet.getRange(foundRow, 2, 1, 2).setValues([[serialized, nowFormatted]]);
      } else {
        sheet.appendRow(["SHOP_SETTINGS", serialized, nowFormatted]);
      }
    } catch (sheetErr) {
      console.warn("Could not write settings to Settings sheet: " + sheetErr);
    }

    // 2. Safe write to Script Properties (quota protected in try/catch)
    try {
      var properties = PropertiesService.getScriptProperties();
      properties.setProperty("SHOP_SETTINGS", serialized);
    } catch (propsErr) {
      // Non-blocking quota safe catch
      console.warn("Script properties quota reached, settings preserved in Settings sheet.");
    }

    return json_({ success: true, settings: parsed });
  } catch (err) {
    return json_({ success: false, error: String(err) });
  }
}

/* =========================================================================
   CATALOG SERIALIZATION & GOOGLE SHEETS STORAGE
   ========================================================================= */

var IMAGE_CHUNK_SIZE = 45000;

function readCatalogFromSheets_() {
  var catSheet = getCategoriesSheet_();
  var prodSheet = getProductsSheet_();

  var catLastRow = catSheet.getLastRow();
  var prodLastRow = prodSheet.getLastRow();

  if (catLastRow < 2 && prodLastRow < 2) {
    return null;
  }

  var categoryMap = {};
  var categories = [];

  // 1. Read categories
  if (catLastRow > 1) {
    var catValues = catSheet.getRange(2, 1, catLastRow - 1, CATEGORY_HEADERS.length).getValues();
    for (var i = 0; i < catValues.length; i++) {
      var cr = catValues[i];
      var catName = String(cr[1] || "").trim();
      if (!catName) continue;

      var extraCat = {};
      try {
        if (cr[8]) extraCat = JSON.parse(String(cr[8]));
      } catch (eIgnore) {}

      var catObj = {
        id: String(cr[0] || catName),
        name: catName,
        tamil: String(cr[2] || ""),
        active: cr[3] !== false && String(cr[3]).toLowerCase() !== "false",
        hideImages: cr[4] === true || String(cr[4]).toLowerCase() === "true",
        priceIsFinal: cr[5] === true || String(cr[5]).toLowerCase() === "true",
        order: typeof cr[6] === "number" ? cr[6] : i,
        isDemo: cr[7] === true || String(cr[7]).toLowerCase() === "true",
        products: [],
      };

      if (extraCat && typeof extraCat === "object") {
        for (var k in extraCat) {
          if (catObj[k] === undefined) catObj[k] = extraCat[k];
        }
      }

      categoryMap[catName.toLowerCase()] = catObj;
      categories.push(catObj);
    }
  }

  // 2. Read products
  if (prodLastRow > 1) {
    var prodValues = prodSheet.getRange(2, 1, prodLastRow - 1, PRODUCT_HEADERS.length).getValues();
    for (var j = 0; j < prodValues.length; j++) {
      var pr = prodValues[j];
      var pId = pr[0];
      var pCategory = String(pr[1] || "").trim();
      var pName = String(pr[2] || "").trim();
      if (!pName && !pId) continue;

      var catObjRef = categoryMap[pCategory.toLowerCase()];
      if (!catObjRef) {
        catObjRef = {
          name: pCategory || "General",
          products: [],
          active: true,
          order: categories.length,
        };
        categoryMap[(pCategory || "General").toLowerCase()] = catObjRef;
        categories.push(catObjRef);
      }

      // Recombine image chunks safely (Parts 1, 2, 3, 4)
      var pImg = (
        String(pr[7] || "") +
        String(pr[8] || "") +
        String(pr[9] || "") +
        String(pr[10] || "")
      ).trim() || null;

      var extraProd = {};
      try {
        if (pr[22]) extraProd = JSON.parse(String(pr[22]));
      } catch (ePJson) {}

      var numId = typeof pId === "number" ? pId : Number(pId) || pId;
      var prodObj = {
        id: numId,
        name: pName,
        tamil: String(pr[3] || ""),
        rate: Number(pr[4]) || 0,
        price: Number(pr[5]) || 0,
        unit: String(pr[6] || "1 Pkt"),
        image: pImg,
        showImage: pr[11] !== false && String(pr[11]).toLowerCase() !== "false",
        active: pr[12] !== false && String(pr[12]).toLowerCase() !== "false",
        caseOnly: pr[13] === true || String(pr[13]).toLowerCase() === "true",
        caseQuantity: Number(pr[14]) || 0,
        caseValue: Number(pr[15]) || 0,
        caseDiscount: Number(pr[16]) || 0,
        casePrice: Number(pr[17]) || 0,
        hasCustomPrice: pr[18] === true || String(pr[18]).toLowerCase() === "true",
        slug: String(pr[20] || ""),
        isDemo: pr[21] === true || String(pr[21]).toLowerCase() === "true",
      };

      if (extraProd && typeof extraProd === "object") {
        for (var epKey in extraProd) {
          if (prodObj[epKey] === undefined) prodObj[epKey] = extraProd[epKey];
        }
      }

      catObjRef.products.push(prodObj);
    }
  }

  // Sort categories by order
  categories.sort(function (a, b) {
    var ordA = typeof a.order === "number" ? a.order : 0;
    var ordB = typeof b.order === "number" ? b.order : 0;
    return ordA - ordB;
  });

  return categories;
}

function saveCatalogToSheets_(categories, optionalSettings) {
  if (!Array.isArray(categories)) {
    throw new Error("Categories must be an array");
  }

  var catSheet = getCategoriesSheet_();
  var prodSheet = getProductsSheet_();

  var categoryRows = [];
  var productRows = [];

  for (var i = 0; i < categories.length; i++) {
    var cat = categories[i] || {};
    var catName = String(cat.name || "").trim();
    if (!catName) continue;

    var extraCat = {};
    for (var k in cat) {
      if (
        [
          "id",
          "name",
          "tamil",
          "active",
          "hideImages",
          "priceIsFinal",
          "order",
          "isDemo",
          "products",
          "_shopSettings",
        ].indexOf(k) === -1
      ) {
        extraCat[k] = cat[k];
      }
    }

    categoryRows.push([
      cat.id || catName,
      catName,
      cat.tamil || "",
      cat.active !== false,
      cat.hideImages === true,
      cat.priceIsFinal === true,
      typeof cat.order === "number" ? cat.order : i,
      cat.isDemo === true,
      Object.keys(extraCat).length > 0 ? JSON.stringify(extraCat) : "",
    ]);

    var prods = Array.isArray(cat.products) ? cat.products : [];
    for (var j = 0; j < prods.length; j++) {
      var prod = prods[j] || {};
      var imgStr = typeof prod.image === "string" ? prod.image : "";

      var imgPart1 = imgStr.slice(0, IMAGE_CHUNK_SIZE);
      var imgPart2 = imgStr.slice(IMAGE_CHUNK_SIZE, IMAGE_CHUNK_SIZE * 2);
      var imgPart3 = imgStr.slice(IMAGE_CHUNK_SIZE * 2, IMAGE_CHUNK_SIZE * 3);
      var imgPart4 = imgStr.slice(IMAGE_CHUNK_SIZE * 3, IMAGE_CHUNK_SIZE * 4);

      var extraProd = {};
      for (var pk in prod) {
        if (
          [
            "id",
            "name",
            "tamil",
            "rate",
            "price",
            "unit",
            "image",
            "showImage",
            "active",
            "caseOnly",
            "caseQuantity",
            "caseValue",
            "caseDiscount",
            "casePrice",
            "hasCustomPrice",
            "displayOrder",
            "slug",
            "isDemo",
          ].indexOf(pk) === -1
        ) {
          extraProd[pk] = prod[pk];
        }
      }

      productRows.push([
        prod.id !== undefined ? prod.id : Date.now() + j,
        catName,
        prod.name || "",
        prod.tamil || "",
        Number(prod.rate) || 0,
        Number(prod.price) || 0,
        prod.unit || "1 Pkt",
        imgPart1,
        imgPart2,
        imgPart3,
        imgPart4,
        prod.showImage !== false,
        prod.active !== false,
        prod.caseOnly === true,
        Number(prod.caseQuantity) || 0,
        Number(prod.caseValue) || 0,
        Number(prod.caseDiscount) || 0,
        Number(prod.casePrice) || 0,
        prod.hasCustomPrice === true,
        prod.displayOrder !== undefined ? prod.displayOrder : j,
        prod.slug || "",
        prod.isDemo === true,
        Object.keys(extraProd).length > 0 ? JSON.stringify(extraProd) : "",
      ]);
    }
  }

  // 1. Write Categories sheet
  catSheet.clearContents();
  catSheet.appendRow(CATEGORY_HEADERS);
  catSheet.setFrozenRows(1);
  formatHeaderRow_(catSheet, CATEGORY_HEADERS.length);

  if (categoryRows.length > 0) {
    catSheet.getRange(2, 1, categoryRows.length, CATEGORY_HEADERS.length).setValues(categoryRows);
    var catRange = catSheet.getRange(2, 1, categoryRows.length, CATEGORY_HEADERS.length);
    catRange.setBorder(true, true, true, true, true, true, "#e6dcc4", SpreadsheetApp.BorderStyle.SOLID);
  }

  // 2. Write Products sheet
  prodSheet.clearContents();
  prodSheet.appendRow(PRODUCT_HEADERS);
  prodSheet.setFrozenRows(1);
  formatHeaderRow_(prodSheet, PRODUCT_HEADERS.length);

  if (productRows.length > 0) {
    prodSheet.getRange(2, 1, productRows.length, PRODUCT_HEADERS.length).setValues(productRows);
    var prodRange = prodSheet.getRange(2, 1, productRows.length, PRODUCT_HEADERS.length);
    prodRange.setBorder(true, true, true, true, true, true, "#e6dcc4", SpreadsheetApp.BorderStyle.SOLID);
  }

  // 3. Optional Settings save
  if (optionalSettings && typeof optionalSettings === "object") {
    saveSettings_(optionalSettings);
  }

  return {
    categoriesCount: categoryRows.length,
    productsCount: productRows.length,
  };
}

/* =========================================================================
   MIGRATION & VERIFICATION
   ========================================================================= */

function readLegacyCatalogBackup_() {
  // 1. Try reading from Catalog_Store sheet
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(CATALOG_STORE_SHEET_NAME);
    if (sheet && sheet.getLastRow() > 1) {
      var values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
      var jsonStr = "";
      for (var i = 0; i < values.length; i++) {
        jsonStr += String(values[i][0] || "");
      }
      if (jsonStr) {
        var parsed = JSON.parse(jsonStr);
        if (parsed && Array.isArray(parsed.categories) && parsed.categories.length > 0) {
          return parsed;
        }
      }
    }
  } catch (eStore) {}

  // 2. Try reading from Script Properties chunks
  try {
    var properties = PropertiesService.getScriptProperties();
    var count = Number(properties.getProperty("CATALOG_CHUNK_COUNT") || 0);
    if (count > 0) {
      var fullChunked = "";
      for (var j = 0; j < count; j++) {
        fullChunked += properties.getProperty("CATALOG_CHUNK_" + j) || "";
      }
      if (fullChunked) {
        var parsedChunks = JSON.parse(fullChunked);
        if (parsedChunks && Array.isArray(parsedChunks.categories) && parsedChunks.categories.length > 0) {
          return parsedChunks;
        }
      }
    }
  } catch (eProps) {}

  return null;
}

function verifySheetsCatalog_(expectedCategories) {
  try {
    var readCats = readCatalogFromSheets_();
    if (!readCats || readCats.length === 0) {
      return { valid: false, error: "Sheets catalog returned 0 categories" };
    }

    var expectedCount = Array.isArray(expectedCategories) ? expectedCategories.length : 0;
    if (expectedCount > 0 && readCats.length !== expectedCount) {
      return {
        valid: false,
        error: "Category count mismatch: expected " + expectedCount + ", got " + readCats.length,
      };
    }

    var totalProds = 0;
    for (var i = 0; i < readCats.length; i++) {
      totalProds += (readCats[i].products || []).length;
    }

    return {
      valid: true,
      categoryCount: readCats.length,
      productCount: totalProds,
    };
  } catch (err) {
    return { valid: false, error: String(err) };
  }
}

function clearLegacyCatalogProperties_() {
  try {
    var properties = PropertiesService.getScriptProperties();
    var count = Number(properties.getProperty("CATALOG_CHUNK_COUNT") || 0);
    if (count > 0) {
      for (var i = 0; i < count + 20; i++) {
        properties.deleteProperty("CATALOG_CHUNK_" + i);
      }
      properties.deleteProperty("CATALOG_CHUNK_COUNT");
    }
  } catch (ignore) {}
}

function migrateCatalogIfNecessary_() {
  var prodSheet = getProductsSheet_();
  var catSheet = getCategoriesSheet_();

  if (prodSheet.getLastRow() > 1 && catSheet.getLastRow() > 1) {
    return true; // Already migrated and active
  }

  var legacy = readLegacyCatalogBackup_();
  if (legacy && Array.isArray(legacy.categories) && legacy.categories.length > 0) {
    saveCatalogToSheets_(legacy.categories, legacy.settings);
    var check = verifySheetsCatalog_(legacy.categories);
    if (check.valid) {
      clearLegacyCatalogProperties_();
      return true;
    }
  }

  return false;
}

function verifyCatalogEndpoint_() {
  try {
    var check = verifySheetsCatalog_();
    return json_({
      success: check.valid,
      categoryCount: check.categoryCount,
      productCount: check.productCount,
      error: check.error || null,
    });
  } catch (err) {
    return json_({ success: false, error: String(err) });
  }
}

function migrateCatalogEndpoint_() {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
  } catch (lockErr) {}

  try {
    var migrated = migrateCatalogIfNecessary_();
    var check = verifySheetsCatalog_();
    return json_({
      success: migrated && check.valid,
      categoryCount: check.categoryCount,
      productCount: check.productCount,
      error: check.error || null,
    });
  } catch (err) {
    return json_({ success: false, error: String(err) });
  } finally {
    try {
      lock.releaseLock();
    } catch (e) {}
  }
}

/* =========================================================================
   PUBLIC CATALOG API (GET & POST)
   ========================================================================= */

function getCatalog_() {
  try {
    migrateCatalogIfNecessary_();

    var savedSettings = getSavedSettings_();
    var categories = readCatalogFromSheets_();

    if (!categories || categories.length === 0) {
      var fallbackLegacy = readLegacyCatalogBackup_();
      if (fallbackLegacy && Array.isArray(fallbackLegacy.categories)) {
        categories = fallbackLegacy.categories;
        savedSettings = fallbackLegacy.settings || savedSettings;
      }
    }

    return json_({
      success: true,
      categories: categories || [],
      settings: savedSettings || null,
    });
  } catch (err) {
    return json_({
      success: false,
      error: String(err),
      categories: [],
      settings: getSavedSettings_(),
    });
  }
}

function saveCatalog_(rawCatalog) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
  } catch (lockErr) {}

  try {
    var parsed = typeof rawCatalog === "object" ? rawCatalog : JSON.parse(String(rawCatalog || "{}"));
    if (!parsed || !Array.isArray(parsed.categories)) {
      return json_({ success: false, error: "Invalid catalog format" });
    }

    var result = saveCatalogToSheets_(parsed.categories, parsed.settings);

    // Verify written catalog
    var check = verifySheetsCatalog_(parsed.categories);
    if (check.valid) {
      clearLegacyCatalogProperties_();
    }

    return json_({
      success: true,
      categoriesCount: result.categoriesCount,
      productsCount: result.productsCount,
    });
  } catch (err) {
    return json_({ success: false, error: String(err) });
  } finally {
    try {
      lock.releaseLock();
    } catch (e) {}
  }
}

/* =========================================================================
   GRANULAR CRUD ENDPOINTS (Fast Row-level Sheet Operations)
   ========================================================================= */

function addProductEndpoint_(params, body) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
  } catch (lockErr) {}

  try {
    var rawProd = params.product || body.product || body;
    var catName = String(params.categoryName || body.categoryName || "").trim();
    var prod = typeof rawProd === "object" ? rawProd : JSON.parse(String(rawProd || "{}"));

    if (!prod || !prod.name) {
      return json_({ success: false, error: "Invalid product data" });
    }

    if (!catName) {
      catName = "One Sound Crackers";
    }

    // Ensure catalog is initialized in Sheets
    migrateCatalogIfNecessary_();

    var prodSheet = getProductsSheet_();
    var catSheet = getCategoriesSheet_();

    // Ensure category exists
    var catLastRow = catSheet.getLastRow();
    var catExists = false;
    if (catLastRow > 1) {
      var catNames = catSheet.getRange(2, 2, catLastRow - 1, 1).getValues();
      for (var i = 0; i < catNames.length; i++) {
        if (String(catNames[i][0] || "").toLowerCase() === catName.toLowerCase()) {
          catExists = true;
          break;
        }
      }
    }
    if (!catExists) {
      catSheet.appendRow([catName, catName, "", true, false, false, catLastRow, false, ""]);
    }

    var imgStr = typeof prod.image === "string" ? prod.image : "";
    var imgPart1 = imgStr.slice(0, IMAGE_CHUNK_SIZE);
    var imgPart2 = imgStr.slice(IMAGE_CHUNK_SIZE, IMAGE_CHUNK_SIZE * 2);
    var imgPart3 = imgStr.slice(IMAGE_CHUNK_SIZE * 2, IMAGE_CHUNK_SIZE * 3);
    var imgPart4 = imgStr.slice(IMAGE_CHUNK_SIZE * 3, IMAGE_CHUNK_SIZE * 4);

    var newId = prod.id || Date.now();
    var newRow = [
      newId,
      catName,
      prod.name || "",
      prod.tamil || "",
      Number(prod.rate) || 0,
      Number(prod.price) || 0,
      prod.unit || "1 Pkt",
      imgPart1,
      imgPart2,
      imgPart3,
      imgPart4,
      prod.showImage !== false,
      prod.active !== false,
      prod.caseOnly === true,
      Number(prod.caseQuantity) || 0,
      Number(prod.caseValue) || 0,
      Number(prod.caseDiscount) || 0,
      Number(prod.casePrice) || 0,
      prod.hasCustomPrice === true,
      prod.displayOrder !== undefined ? prod.displayOrder : 0,
      prod.slug || "",
      prod.isDemo === true,
      "",
    ];

    prodSheet.appendRow(newRow);
    return json_({ success: true, product: prod });
  } catch (err) {
    return json_({ success: false, error: String(err) });
  } finally {
    try {
      lock.releaseLock();
    } catch (e) {}
  }
}

function updateProductEndpoint_(params, body) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
  } catch (lockErr) {}

  try {
    var rawProd = params.product || body.product || body;
    var catName = String(params.categoryName || body.categoryName || "").trim();
    var prod = typeof rawProd === "object" ? rawProd : JSON.parse(String(rawProd || "{}"));

    if (!prod || prod.id === undefined) {
      return json_({ success: false, error: "Missing product ID" });
    }

    migrateCatalogIfNecessary_();
    var prodSheet = getProductsSheet_();
    var lastRow = prodSheet.getLastRow();
    if (lastRow < 2) {
      return json_({ success: false, error: "No products in sheet" });
    }

    var ids = prodSheet.getRange(2, 1, lastRow - 1, 1).getValues();
    var targetRow = -1;
    for (var i = 0; i < ids.length; i++) {
      if (String(ids[i][0]) === String(prod.id)) {
        targetRow = i + 2;
        break;
      }
    }

    if (targetRow === -1) {
      return json_({ success: false, error: "Product ID not found: " + prod.id });
    }

    var imgStr = typeof prod.image === "string" ? prod.image : "";
    var imgPart1 = imgStr.slice(0, IMAGE_CHUNK_SIZE);
    var imgPart2 = imgStr.slice(IMAGE_CHUNK_SIZE, IMAGE_CHUNK_SIZE * 2);
    var imgPart3 = imgStr.slice(IMAGE_CHUNK_SIZE * 2, IMAGE_CHUNK_SIZE * 3);
    var imgPart4 = imgStr.slice(IMAGE_CHUNK_SIZE * 3, IMAGE_CHUNK_SIZE * 4);

    var existingCat = String(prodSheet.getRange(targetRow, 2).getValue() || "");
    var finalCat = catName || existingCat || "One Sound Crackers";

    var updatedValues = [
      prod.id,
      finalCat,
      prod.name || "",
      prod.tamil || "",
      Number(prod.rate) || 0,
      Number(prod.price) || 0,
      prod.unit || "1 Pkt",
      imgPart1,
      imgPart2,
      imgPart3,
      imgPart4,
      prod.showImage !== false,
      prod.active !== false,
      prod.caseOnly === true,
      Number(prod.caseQuantity) || 0,
      Number(prod.caseValue) || 0,
      Number(prod.caseDiscount) || 0,
      Number(prod.casePrice) || 0,
      prod.hasCustomPrice === true,
      prod.displayOrder !== undefined ? prod.displayOrder : 0,
      prod.slug || "",
      prod.isDemo === true,
      "",
    ];

    prodSheet.getRange(targetRow, 1, 1, PRODUCT_HEADERS.length).setValues([updatedValues]);
    return json_({ success: true, product: prod });
  } catch (err) {
    return json_({ success: false, error: String(err) });
  } finally {
    try {
      lock.releaseLock();
    } catch (e) {}
  }
}

function deleteProductEndpoint_(params, body) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
  } catch (lockErr) {}

  try {
    var pId = params.productId || body.productId || body.id;
    if (pId === undefined) {
      return json_({ success: false, error: "Missing productId" });
    }

    migrateCatalogIfNecessary_();
    var prodSheet = getProductsSheet_();
    var lastRow = prodSheet.getLastRow();
    if (lastRow < 2) return json_({ success: true });

    var ids = prodSheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < ids.length; i++) {
      if (String(ids[i][0]) === String(pId)) {
        prodSheet.deleteRow(i + 2);
        return json_({ success: true });
      }
    }

    return json_({ success: true });
  } catch (err) {
    return json_({ success: false, error: String(err) });
  } finally {
    try {
      lock.releaseLock();
    } catch (e) {}
  }
}

function toggleProductActiveEndpoint_(params, body) {
  try {
    var pId = params.productId || body.productId || body.id;
    if (pId === undefined) {
      return json_({ success: false, error: "Missing productId" });
    }

    migrateCatalogIfNecessary_();
    var prodSheet = getProductsSheet_();
    var lastRow = prodSheet.getLastRow();
    if (lastRow < 2) return json_({ success: false, error: "No products found" });

    var ids = prodSheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < ids.length; i++) {
      if (String(ids[i][0]) === String(pId)) {
        var row = i + 2;
        var curVal = prodSheet.getRange(row, 13).getValue();
        var nextVal = curVal === false || String(curVal).toLowerCase() === "false" ? true : false;
        prodSheet.getRange(row, 13).setValue(nextVal);
        return json_({ success: true, active: nextVal });
      }
    }

    return json_({ success: false, error: "Product not found" });
  } catch (err) {
    return json_({ success: false, error: String(err) });
  }
}

function reorderProductEndpoint_(params, body) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
  } catch (lockErr) {}

  try {
    var categories = (params.categories || body.categories);
    if (categories && Array.isArray(categories)) {
      saveCatalogToSheets_(categories);
      return json_({ success: true });
    }
    return json_({ success: true });
  } catch (err) {
    return json_({ success: false, error: String(err) });
  } finally {
    try {
      lock.releaseLock();
    } catch (e) {}
  }
}

function addCategoryEndpoint_(params, body) {
  try {
    var catName = String(params.name || body.name || "").trim();
    if (!catName) return json_({ success: false, error: "Missing category name" });

    migrateCatalogIfNecessary_();
    var catSheet = getCategoriesSheet_();
    var lastRow = catSheet.getLastRow();

    if (lastRow > 1) {
      var names = catSheet.getRange(2, 2, lastRow - 1, 1).getValues();
      for (var i = 0; i < names.length; i++) {
        if (String(names[i][0] || "").toLowerCase() === catName.toLowerCase()) {
          return json_({ success: true }); // Already exists
        }
      }
    }

    catSheet.appendRow([catName, catName, "", true, false, false, lastRow, false, ""]);
    return json_({ success: true });
  } catch (err) {
    return json_({ success: false, error: String(err) });
  }
}

function updateCategoryEndpoint_(params, body) {
  try {
    var oldName = String(params.oldName || body.oldName || "").trim();
    var newName = String(params.name || body.name || oldName).trim();
    var active = params.active !== undefined ? params.active : body.active;
    var hideImages = params.hideImages !== undefined ? params.hideImages : body.hideImages;

    if (!oldName) return json_({ success: false, error: "Missing oldName" });

    migrateCatalogIfNecessary_();
    var catSheet = getCategoriesSheet_();
    var prodSheet = getProductsSheet_();
    var lastRow = catSheet.getLastRow();

    if (lastRow > 1) {
      var names = catSheet.getRange(2, 2, lastRow - 1, 1).getValues();
      for (var i = 0; i < names.length; i++) {
        if (String(names[i][0] || "").toLowerCase() === oldName.toLowerCase()) {
          var row = i + 2;
          if (newName) catSheet.getRange(row, 2).setValue(newName);
          if (active !== undefined) catSheet.getRange(row, 4).setValue(Boolean(active));
          if (hideImages !== undefined) catSheet.getRange(row, 5).setValue(Boolean(hideImages));
          break;
        }
      }
    }

    // If category was renamed, update matching products in Products sheet
    if (newName && newName.toLowerCase() !== oldName.toLowerCase()) {
      var prodLastRow = prodSheet.getLastRow();
      if (prodLastRow > 1) {
        var prodCats = prodSheet.getRange(2, 2, prodLastRow - 1, 1).getValues();
        for (var j = 0; j < prodCats.length; j++) {
          if (String(prodCats[j][0] || "").toLowerCase() === oldName.toLowerCase()) {
            prodSheet.getRange(j + 2, 2).setValue(newName);
          }
        }
      }
    }

    return json_({ success: true });
  } catch (err) {
    return json_({ success: false, error: String(err) });
  }
}

function deleteCategoryEndpoint_(params, body) {
  try {
    var catName = String(params.name || body.name || "").trim();
    if (!catName) return json_({ success: false, error: "Missing category name" });

    migrateCatalogIfNecessary_();
    var catSheet = getCategoriesSheet_();
    var prodSheet = getProductsSheet_();

    // Check if products exist in category
    var prodLastRow = prodSheet.getLastRow();
    if (prodLastRow > 1) {
      var prodCats = prodSheet.getRange(2, 2, prodLastRow - 1, 1).getValues();
      for (var j = 0; j < prodCats.length; j++) {
        if (String(prodCats[j][0] || "").toLowerCase() === catName.toLowerCase()) {
          return json_({
            success: false,
            error: "Category has products. Move or delete them first.",
          });
        }
      }
    }

    var lastRow = catSheet.getLastRow();
    if (lastRow > 1) {
      var names = catSheet.getRange(2, 2, lastRow - 1, 1).getValues();
      for (var i = 0; i < names.length; i++) {
        if (String(names[i][0] || "").toLowerCase() === catName.toLowerCase()) {
          catSheet.deleteRow(i + 2);
          return json_({ success: true });
        }
      }
    }

    return json_({ success: true });
  } catch (err) {
    return json_({ success: false, error: String(err) });
  }
}

function reorderCategoryEndpoint_(params, body) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
  } catch (lockErr) {}

  try {
    var categories = params.categories || body.categories;
    if (categories && Array.isArray(categories)) {
      saveCatalogToSheets_(categories);
      return json_({ success: true });
    }
    return json_({ success: true });
  } catch (err) {
    return json_({ success: false, error: String(err) });
  } finally {
    try {
      lock.releaseLock();
    } catch (e) {}
  }
}

/* =========================================================================
   ORDERS RECEIVER & PDF INVOICE MAILER (Responses Sheet)
   ========================================================================= */

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
      "Order Confirmed",
    ]);

    applyStatusValidation_(sheet, row);

    var newRow = sheet.getRange(row, 1, 1, HEADERS.length);
    newRow
      .setVerticalAlignment("top")
      .setBackground(row % 2 === 0 ? C_CREAM : C_CREAM_ALT)
      .setBorder(true, true, true, true, true, true, "#e6dcc4", SpreadsheetApp.BorderStyle.SOLID);
    sheet.getRange(row, 10).setWrap(true);
    sheet.setRowHeight(row, Math.max(21, items.split(String.fromCharCode(10)).length * 16));
    colorStatus_(sheet.getRange(row, STATUS_COL), "Order Confirmed");

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
  var value = String(rawStatus || "Order Confirmed").trim();
  if (!value) value = "Order Confirmed";
  var normalized = value;
  var lower = value.toLowerCase();
  if (lower === "confirmed" || lower === "new" || lower === "order confirmed") {
    normalized = "Order Confirmed";
  }
  if (lower === "in transit" || lower === "dispatch" || lower === "shipping") {
    normalized = "Shipped";
  }
  if (lower === "payment pending" || lower === "payment" || lower === "paid") {
    normalized = "Payment Completed";
  }
  if (
    lower === "packaging finished" ||
    lower === "packing finished" ||
    lower === "packing" ||
    lower === "package finished"
  ) {
    normalized = "Packaging Finished";
  }
  if (lower === "cancelled" || lower === "canceled") {
    normalized = "Cancelled";
  }
  if (STATUSES.indexOf(normalized) === -1) {
    return "Order Confirmed";
  }
  return normalized;
}

function getCustomerStatusMessage_(status, orderId, customerName) {
  var messages = {
    "Order Confirmed": "Your order " + orderId + " has been confirmed and is being prepared.",
    "Payment Completed": "We have received the payment for order " + orderId + ". We are preparing your package for dispatch.",
    "Packaging Finished": "Your order " + orderId + " has finished packaging and is ready to be shipped.",
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
    var status = normalizeStatus_(sheet.getRange(row, STATUS_COL).getValue() || "Order Confirmed");

    if (!email || !orderId || !status) {
      return false;
    }

    var subject = "Order " + orderId + " status: " + status;
    var html =
      '<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;border:1px solid #e6dcc4;background:#fffdf8">' +
      '<div style="background:#7a1420;padding:18px 20px;text-align:center;border-bottom:3px solid #c9a24d">' +
      '<span style="color:#c9a24d;font-size:20px;font-weight:bold;letter-spacing:2px">NAMBI CRACKERS</span>' +
      "</div>" +
      '<div style="padding:22px 18px;color:#2a2222;line-height:1.7">' +
      '<p style="margin:0 0 12px">Hi <b>' +
      customerName +
      "</b>,</p>" +
      '<p style="margin:0 0 12px">Your order <b>' +
      orderId +
      '</b> is now marked as <b style="color:#7a1420">' +
      status +
      "</b>.</p>" +
      '<p style="margin:0 0 12px">' +
      (status === "Order Confirmed"
        ? "We have received your request and are preparing your order."
        : status === "Payment Completed"
          ? "We have received your payment and are preparing the order."
          : status === "Packaging Finished"
            ? "Your package is ready and will be handed over for shipment soon."
            : status === "Shipped"
              ? "Your order is on the way and will reach you soon."
              : status === "Delivered"
                ? "Your order has been delivered. Thank you for shopping with us."
                : "Your order has been cancelled. Please contact us if you need help.") +
      "</p>" +
      '<p style="margin:0;text-align:center;color:#7a1420;font-weight:bold">Thank You</p>' +
      '<p style="margin:4px 0 0;text-align:center;color:#7a1420;letter-spacing:1.2px;font-weight:bold">NAMBI CRACKERS</p>' +
      "</div></div>;";

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
    var status = normalizeStatus_(params.status || "Order Confirmed");
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
        var currentStatus = String(sheet.getRange(r, STATUS_COL).getValue() || "Order Confirmed");
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
    result.error += String(mailErr);
  }
  return result;
}

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
        status: String(r[15] || "Order Confirmed"),
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

  var hv = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), HEADERS.length)).getValues()[0];
  if (String(hv[14] || "") === "Status" && String(hv[15] || "") === "City") {
    var maxRows = sheet.getMaxRows();
    sheet.getRange(1, 15, maxRows, 1).moveTo(sheet.getRange(1, 17, maxRows, 1));
    sheet.deleteColumn(15);
    hv = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), HEADERS.length)).getValues()[0];
  }

  if (String(hv[STATUS_COL - 1] || "") !== "Status") {
    sheet.getRange(1, STATUS_COL).setValue("Status");
  }

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

  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    var statusVals = sheet.getRange(2, STATUS_COL, lastRow - 1, 1).getValues();
    for (var i = 0; i < statusVals.length; i++) {
      colorStatus_(sheet.getRange(i + 2, STATUS_COL), String(statusVals[i][0] || "Order Confirmed"));
    }
  }

  if (sheet.getColumnWidth(10) < 200) {
    sheet.setColumnWidth(10, 320);
  }

  return sheet;
}

function colorStatus_(range, value) {
  var c = STATUS_COLORS[value] || STATUS_COLORS["Order Confirmed"];
  if (!value) value = "Order Confirmed";
  range
    .setValue(value)
    .setBackground(c.bg)
    .setFontColor(c.fg)
    .setFontWeight("bold")
    .setHorizontalAlignment("center");
}

function onEdit(e) {
  try {
    var range = e.range;
    var sheet = range.getSheet();
    if (sheet.getName() !== SHEET_NAME) return;
    if (range.getColumn() === STATUS_COL && range.getRow() > 1) {
      var oldValue = String(e.oldValue || "");
      var newValue = normalizeStatus_(String(range.getValue() || "Order Confirmed"));
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
