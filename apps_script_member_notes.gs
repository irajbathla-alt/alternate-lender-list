/**
 * Member Notes API (Google Apps Script)
 *
 * Deploy as:
 * - Deploy > New deployment > Web app
 * - Execute as: Me
 * - Who has access: Anyone
 *
 * Sheet setup:
 * - Spreadsheet with tab name: member_notes
 * - Header row (A1:E1): key | tab | member | note | updatedAt
 *
 * IMPORTANT:
 * - If this script is NOT bound to the destination Google Sheet,
 *   set SPREADSHEET_ID to the target sheet id below.
 */

var SPREADSHEET_ID = ''; // e.g. '1AbC...xyz'. Leave blank only if script is container-bound to the sheet.
var SHEET_NAME = 'member_notes';
var HEADERS = ['key', 'tab', 'member', 'note', 'updatedAt'];
var THREAD_SHEET = 'deal_threads';
var THREAD_HEADERS = ['id', 'requester', 'contact', 'propertyLocation', 'requestedAmount', 'requestedLtv', 'requirement', 'status', 'createdAt', 'updatedAt'];
var THREAD_MSG_SHEET = 'deal_thread_messages';
var THREAD_MSG_HEADERS = ['threadId', 'fromName', 'fromContact', 'message', 'createdAt'];

function doGet(e) {
  try {
    var p = (e && e.parameter) || {};
    var resource = String(p.resource || '');
    if (resource === 'deal_threads') {
      var ts = getSheetBySchema_(THREAD_SHEET, THREAD_HEADERS);
      var ms = getSheetBySchema_(THREAD_MSG_SHEET, THREAD_MSG_HEADERS);
      var threads = getRowsByHeaders_(ts, THREAD_HEADERS).sort(function (a, b) {
        return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
      });
      var messages = getRowsByHeaders_(ms, THREAD_MSG_HEADERS).sort(function (a, b) {
        return String(a.createdAt || '').localeCompare(String(b.createdAt || ''));
      });
      return jsonWithCallback_({ ok: true, threads: threads, messages: messages }, p);
    }
    if (resource !== 'member_notes') return jsonWithCallback_({ ok: false, error: 'Unknown resource' }, p);

    var sh = getSheet_();
    var rows = getRows_(sh);
    var notes = {};

    rows.forEach(function (r) {
      if (!r.key) return;
      notes[r.key] = r.note || '';
    });

    // Health check endpoint used by UI sync status
    if (String(p.check || '') === '1') {
      return jsonWithCallback_({ ok: true, count: Object.keys(notes).length, now: new Date().toISOString() }, p);
    }

    return jsonWithCallback_({ ok: true, notes: notes, count: Object.keys(notes).length }, p);
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function doPost(e) {
  try {
    var p = getParams_(e);
    var resource = String(p.resource || '');
    if (resource === 'deal_threads') {
      return handleThreadPost_(p);
    }
    if (resource !== 'member_notes') return json_({ ok: false, error: 'Unknown resource' });

    var action = String(p.action || 'upsert').toLowerCase();
    var tab = String(p.tab || '').trim();
    var member = String(p.member || '').trim();
    var note = String(p.note || '');
    var updatedAt = String(p.updatedAt || new Date().toISOString());

    if (!tab || !member) return json_({ ok: false, error: 'tab/member required' });

    var key = buildKey_(tab, member);
    var sh = getSheet_();
    var rowIndex = findRowByKey_(sh, key);

    if (action === 'delete') {
      if (rowIndex > 0) sh.deleteRow(rowIndex);
      return json_({ ok: true, action: 'delete', key: key });
    }

    if (rowIndex > 0) {
      sh.getRange(rowIndex, 1, 1, 5).setValues([[key, tab, member, note, updatedAt]]);
    } else {
      sh.appendRow([key, tab, member, note, updatedAt]);
    }

    return json_({ ok: true, action: 'upsert', key: key });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function handleThreadPost_(p) {
  var action = String(p.action || '').toLowerCase();
  var now = String(p.createdAt || new Date().toISOString());
  var ts = getSheetBySchema_(THREAD_SHEET, THREAD_HEADERS);
  var ms = getSheetBySchema_(THREAD_MSG_SHEET, THREAD_MSG_HEADERS);

  if (action === 'create') {
    var requester = String(p.requester || '').trim();
    var contact = String(p.contact || '').trim();
    var propertyLocation = String(p.propertyLocation || '').trim();
    var requestedAmount = String(p.requestedAmount || '').trim();
    var requestedLtv = String(p.requestedLtv || '').trim();
    var requirement = String(p.requirement || '').trim();
    if (!requester || !contact || !propertyLocation || !requestedAmount || !requestedLtv) return json_({ ok: false, error: 'Missing create fields' });
    var id = 'D' + new Date().getTime().toString(36).toUpperCase();
    ts.appendRow([id, requester, contact, propertyLocation, requestedAmount, requestedLtv, requirement, 'OPEN', now, now]);
    return json_({ ok: true, action: 'create', id: id });
  }

  if (action === 'reply') {
    var threadId = String(p.threadId || '').trim();
    var fromName = String(p.fromName || '').trim();
    var fromContact = String(p.fromContact || '').trim();
    var message = String(p.message || '').trim();
    if (!threadId || !fromName || !fromContact || !message) return json_({ ok: false, error: 'Missing reply fields' });
    ms.appendRow([threadId, fromName, fromContact, message, now]);
    touchThread_(ts, threadId, now);
    return json_({ ok: true, action: 'reply', threadId: threadId });
  }

  return json_({ ok: false, error: 'Unknown thread action' });
}

function touchThread_(threadSheet, threadId, nowIso) {
  var rows = threadSheet.getLastRow();
  if (rows < 2) return;
  var values = threadSheet.getRange(2, 1, rows - 1, THREAD_HEADERS.length).getValues();
  for (var i = 0; i < values.length; i++) {
    if (String(values[i][0] || '') === threadId) {
      threadSheet.getRange(i + 2, 10).setValue(nowIso);
      return;
    }
  }
}

function getParams_(e) {
  var out = {};
  if (e && e.parameter) {
    Object.keys(e.parameter).forEach(function (k) { out[k] = String(e.parameter[k] || ''); });
  }
  // In some browser no-cors POST cases, Apps Script may not populate e.parameter.
  // Parse raw body as query-string fallback.
  var raw = e && e.postData && e.postData.contents ? String(e.postData.contents) : '';
  if (raw && Object.keys(out).length === 0) {
    raw.split('&').forEach(function (pair) {
      if (!pair) return;
      var parts = pair.split('=');
      var k = decodeURIComponent((parts[0] || '').replace(/\+/g, ' '));
      var v = decodeURIComponent((parts.slice(1).join('=') || '').replace(/\+/g, ' '));
      out[k] = v;
    });
  }
  return out;
}

function getSheet_() {
  return getSheetBySchema_(SHEET_NAME, HEADERS);
}

function getSheetBySchema_(name, headers) {
  var ss = getSpreadsheet_();
  var sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  var firstRow = sh.getLastRow() >= 1 ? sh.getRange(1, 1, 1, headers.length).getValues()[0] : [];
  var missingHeaders = headers.some(function (h, i) { return firstRow[i] !== h; });
  if (missingHeaders) sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  return sh;
}

function getSpreadsheet_() {
  var active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) return active;
  if (SPREADSHEET_ID) return SpreadsheetApp.openById(SPREADSHEET_ID);
  throw new Error('No active spreadsheet. Set SPREADSHEET_ID in apps_script_member_notes.gs.');
}

function getRows_(sh) {
  return getRowsByHeaders_(sh, HEADERS);
}

function getRowsByHeaders_(sh, headers) {
  var lastRow = sh.getLastRow();
  if (lastRow < 2) return [];
  var values = sh.getRange(2, 1, lastRow - 1, headers.length).getValues();
  return values.map(function (r) {
    var o = {};
    headers.forEach(function (h, idx) { o[h] = String(r[idx] || ''); });
    return o;
  });
}

function findRowByKey_(sh, key) {
  var lastRow = sh.getLastRow();
  if (lastRow < 2) return -1;
  var keys = sh.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < keys.length; i++) {
    if (String(keys[i][0] || '') === key) return i + 2;
  }
  return -1;
}

function buildKey_(tab, member) {
  return String(tab || '').trim().toUpperCase() + '::' + String(member || '').trim().toLowerCase();
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function jsonWithCallback_(obj, params) {
  var cb = params && params.callback ? String(params.callback).trim() : '';
  if (!cb) return json_(obj);
  var safeCb = cb.replace(/[^\w$.]/g, '');
  var payload = safeCb + '(' + JSON.stringify(obj) + ');';
  return ContentService
    .createTextOutput(payload)
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

/**
 * Optional one-time helper:
 * Run manually in Apps Script editor to create/refresh all required tabs/headers
 * in the SAME spreadsheet.
 */
function setupAllSheets_() {
  getSheetBySchema_(SHEET_NAME, HEADERS);
  getSheetBySchema_(THREAD_SHEET, THREAD_HEADERS);
  getSheetBySchema_(THREAD_MSG_SHEET, THREAD_MSG_HEADERS);
}
