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
 */

var SHEET_NAME = 'member_notes';
var HEADERS = ['key', 'tab', 'member', 'note', 'updatedAt'];

function doGet(e) {
  var p = (e && e.parameter) || {};
  var resource = String(p.resource || '');
  if (resource !== 'member_notes') return json_({ ok: false, error: 'Unknown resource' });

  var sh = getSheet_();
  var rows = getRows_(sh);
  var notes = {};

  rows.forEach(function (r) {
    if (!r.key) return;
    notes[r.key] = r.note || '';
  });

  // Health check endpoint used by UI sync status
  if (String(p.check || '') === '1') {
    return json_({ ok: true, count: Object.keys(notes).length, now: new Date().toISOString() });
  }

  return json_({ ok: true, notes: notes, count: Object.keys(notes).length });
}

function doPost(e) {
  var p = (e && e.parameter) || {};
  var resource = String(p.resource || '');
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
}

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) sh = ss.insertSheet(SHEET_NAME);

  var firstRow = sh.getLastRow() >= 1 ? sh.getRange(1, 1, 1, HEADERS.length).getValues()[0] : [];
  var missingHeaders = HEADERS.some(function (h, i) { return firstRow[i] !== h; });
  if (missingHeaders) {
    sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  }
  return sh;
}

function getRows_(sh) {
  var lastRow = sh.getLastRow();
  if (lastRow < 2) return [];
  var values = sh.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
  return values.map(function (r) {
    return {
      key: String(r[0] || ''),
      tab: String(r[1] || ''),
      member: String(r[2] || ''),
      note: String(r[3] || ''),
      updatedAt: String(r[4] || '')
    };
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
