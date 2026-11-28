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
var EXTRA_LENDER_SHEET = 'extra_lenders';
var EXTRA_LENDER_HEADERS = ['id', 'tab', 'name', 'phone', 'website', 'provinces', 'createdAt'];
var ACCOUNT_SHEET = 'accounts';
var ACCOUNT_HEADERS = ['email', 'name', 'phone', 'passwordHash', 'loginCount', 'lastLoginAt', 'createdAt', 'updatedAt'];

function adminHash_(value) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(value), Utilities.Charset.UTF_8);
  return bytes.map(function(b){return ('0'+(b<0?b+256:b).toString(16)).slice(-2);}).join('');
}
function adminAuthGet_(p) {
  var action = String(p.action || '');
  var cache = CacheService.getScriptCache();
  if (action === 'challenge') {
    var nonce = Utilities.getUuid().replace(/-/g,'') + Utilities.getUuid().replace(/-/g,'');
    cache.put('admin_nonce_'+nonce, '1', 120);
    return jsonWithCallback_({ok:true,nonce:nonce},p);
  }
  if (action === 'login') {
    var nonce = String(p.nonce || '');
    var proof = String(p.proof || '').toLowerCase();
    var password = PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD');
    if (!password || !nonce || !cache.get('admin_nonce_'+nonce)) return jsonWithCallback_({ok:false,error:'Invalid or expired login challenge'},p);
    cache.remove('admin_nonce_'+nonce);
    if (adminHash_(password+':'+nonce) !== proof) return jsonWithCallback_({ok:false,error:'Incorrect password'},p);
    var token = Utilities.getUuid().replace(/-/g,'') + Utilities.getUuid().replace(/-/g,'');
    cache.put('admin_session_'+token,'1',21600);
    return jsonWithCallback_({ok:true,token:token,expiresIn:21600},p);
  }
  if (action === 'validate') return jsonWithCallback_({ok:adminAuthorized_(p)},p);
  return jsonWithCallback_({ok:false,error:'Unknown admin action'},p);
}
function adminAuthorized_(p) {
  var token=String(p.adminToken||'');
  return !!token && CacheService.getScriptCache().get('admin_session_'+token)==='1';
}

function doGet(e) {
  var p = (e && e.parameter) || {};
  try {
    var resource = String(p.resource || '');
    if (resource === 'health') {
      var ss = getSpreadsheet_();
      var accounts = ss.getSheetByName(ACCOUNT_SHEET);
      return jsonWithCallback_({ok:true,version:'2026-11-26.3',spreadsheetConnected:true,accountsReady:!!accounts},p);
    }
    if (resource === 'admin_auth') return adminAuthGet_(p);
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
    if (resource === 'extra_lenders') {
      var es = getSheetBySchema_(EXTRA_LENDER_SHEET, EXTRA_LENDER_HEADERS);
      var lenders = getRowsByHeaders_(es, EXTRA_LENDER_HEADERS);
      return jsonWithCallback_({ ok: true, lenders: lenders }, p);
    }
    if (resource === 'accounts') {
      return handleAccountGet_(p);
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
    return jsonWithCallback_({ ok: false, error: String(err) }, p);
  }
}

function doPost(e) {
  try {
    // VFC sends a JSON body as text/plain; keep all legacy form routes unchanged.
    var raw = e && e.postData && e.postData.contents;
    if (raw && /^\s*\{/.test(raw)) {
      var vfcPayload = null;
      try { vfcPayload = JSON.parse(raw); } catch (ignored) {}
      if (vfcPayload && vfcPayload.action === 'send_vfc_mail') {
        return handleVfcMail_(vfcPayload);
      }
    }
    var p = getParams_(e);
    if (String(p.action || '').toLowerCase() === 'account_signup') {
      return handleAccountSignup_(p);
    }
    var resource = String(p.resource || '');
    if (resource === 'deal_threads') {
      return handleThreadPost_(p);
    }
    if (resource === 'extra_lenders') {
      if (!adminAuthorized_(p)) return json_({ok:false,error:'Admin authorization required'});
      return handleExtraLenderPost_(p);
    }
    if (resource === 'accounts') {
      return handleAccountPost_(p);
    }
    if (resource !== 'member_notes') return json_({ ok: false, error: 'Unknown resource' });
    if (!adminAuthorized_(p)) return json_({ok:false,error:'Admin authorization required'});

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

function handleAccountGet_(p) {
  var action = String(p.action || '').toLowerCase();
  if (action !== 'login') return jsonWithCallback_({ ok: false, error: 'Unknown account action' }, p);
  var email = String(p.email || '').trim().toLowerCase();
  var password = String(p.password || '');
  if (!email || !password) return jsonWithCallback_({ ok: false, error: 'Email/password required' }, p);
  var as = getSheetBySchema_(ACCOUNT_SHEET, ACCOUNT_HEADERS);
  var rows = getRowsByHeaders_(as, ACCOUNT_HEADERS);
  var acct = null;
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].email || '').trim().toLowerCase() === email) {
      acct = rows[i];
      break;
    }
  }
  if (!acct) return jsonWithCallback_({ ok: false, error: 'Account does not exist. Please create an account first.' }, p);
  if (String(acct.passwordHash || '') !== hashPassword_(password, email)) {
    return jsonWithCallback_({ ok: false, error: 'Invalid email or password' }, p);
  }
  var newCount = Math.max(0, parseInt(String(acct.loginCount || '0'), 10) || 0) + 1;
  var now = new Date().toISOString();
  var rowIndex = findRowByEmail_(as, email);
  if (rowIndex > 0) {
    as.getRange(rowIndex, 5).setValue(String(newCount));
    as.getRange(rowIndex, 6).setValue(now);
    as.getRange(rowIndex, 8).setValue(now);
  }
  return jsonWithCallback_({
    ok: true,
    account: { email: acct.email, name: acct.name, phone: acct.phone, loginCount: String(newCount), lastLoginAt: now }
  }, p);
}

function handleAccountPost_(p) {
  var action = String(p.action || '').toLowerCase();
  if (action === 'signup') return handleAccountSignup_(p);
  return json_({ ok: false, error: 'Unknown account action' });
}

function handleAccountSignup_(p) {
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try { return handleAccountSignupLocked_(p); } finally { lock.releaseLock(); }
}

function handleAccountSignupLocked_(p) {
  var email = String(p.email || '').trim().toLowerCase();
  var name = String(p.name || '').trim();
  var phone = String(p.phone || '').trim();
  var password = String(p.password || '');
  var now = String(p.createdAt || new Date().toISOString());
  if (!email || !name || !phone || !password) return json_({ ok: false, error: 'Missing signup fields' });
  var as = getSheetBySchema_(ACCOUNT_SHEET, ACCOUNT_HEADERS);
  var rows = getRowsByHeaders_(as, ACCOUNT_HEADERS);
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].email || '').trim().toLowerCase() === email) {
      return json_({ ok: false, error: 'Account already exists' });
    }
  }
  as.appendRow([email, name, phone, hashPassword_(password, email), '0', '', now, now]);
  SpreadsheetApp.flush();
  return json_({ ok: true, action: 'signup', email: email });
}

function findRowByEmail_(sh, email) {
  var lastRow = sh.getLastRow();
  if (lastRow < 2) return -1;
  var emails = sh.getRange(2, 1, lastRow - 1, 1).getValues();
  var target = String(email || '').trim().toLowerCase();
  for (var i = 0; i < emails.length; i++) {
    if (String(emails[i][0] || '').trim().toLowerCase() === target) return i + 2;
  }
  return -1;
}

function hashPassword_(password, email) {
  var raw = String(email || '').toLowerCase() + '::' + String(password || '');
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw, Utilities.Charset.UTF_8);
  return bytes.map(function (b) {
    var v = (b < 0) ? b + 256 : b;
    return ('0' + v.toString(16)).slice(-2);
  }).join('');
}

function handleExtraLenderPost_(p) {
  var action = String(p.action || 'create').toLowerCase();
  if (action !== 'create') return json_({ ok: false, error: 'Unknown lender action' });
  var tab = String(p.tab || 'R').trim().toUpperCase();
  var name = String(p.name || '').trim();
  var phone = String(p.phone || '').trim();
  var website = String(p.website || '').trim();
  var provinces = String(p.provinces || '').trim();
  var createdAt = String(p.createdAt || new Date().toISOString());
  if (!name || !provinces) return json_({ ok: false, error: 'name/provinces required' });
  var id = 'L' + new Date().getTime().toString(36).toUpperCase();
  var es = getSheetBySchema_(EXTRA_LENDER_SHEET, EXTRA_LENDER_HEADERS);
  es.appendRow([id, tab, name, phone, website, provinces, createdAt]);
  return json_({ ok: true, id: id, action: 'create' });
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
  var configuredId = SPREADSHEET_ID || PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (configuredId) return SpreadsheetApp.openById(configuredId);
  var active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) return active;
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
  var ss = getSpreadsheet_();
  PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', ss.getId());
  getSheetBySchema_(SHEET_NAME, HEADERS);
  getSheetBySchema_(THREAD_SHEET, THREAD_HEADERS);
  getSheetBySchema_(THREAD_MSG_SHEET, THREAD_MSG_HEADERS);
  getSheetBySchema_(EXTRA_LENDER_SHEET, EXTRA_LENDER_HEADERS);
  getSheetBySchema_(ACCOUNT_SHEET, ACCOUNT_HEADERS);
}

// Run once from the existing bound Apps Script editor before redeploying.
function configureExistingSpreadsheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('Open this script from the existing spreadsheet, or set SPREADSHEET_ID explicitly.');
  PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', ss.getId());
  Logger.log('Spreadsheet connection configured. Accounts tab present: ' + !!ss.getSheetByName(ACCOUNT_SHEET));
}


// VFC email extension: set VFC_MAIL_SHARED_SECRET in Script Properties.
// Never add a second doPost or expose this secret in frontend code.
function handleVfcMail_(payload) {
  function reply(obj){return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);}
  try {
    var configured=PropertiesService.getScriptProperties().getProperty('VFC_MAIL_SHARED_SECRET');
    if(!configured||configured.length<32||typeof payload.secret!=='string'||payload.secret!==configured){
      return reply({ok:false,error:'Unauthorized'});
    }
    if(payload.action!=='send_vfc_mail')return reply({ok:false,error:'Invalid action'});
    var to=String(payload.to||'').trim().toLowerCase();
    var cc=String(payload.cc||'').trim().toLowerCase();
    var subject=String(payload.subject||'').trim().replace(/[\r\n]/g,' ');
    var body=String(payload.body||'');
    var regex=/^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;
    if(!regex.test(to)||cc&&cc!=='vancouverfinancecompany@gmail.com'
       ||!subject||subject.length>180||!body||body.length>15000){
      return reply({ok:false,error:'Invalid message'});
    }
    var opts={name:'Vancouver Finance Company Inc.',replyTo:'vancouverfinancecompany@gmail.com'};
    if(cc)opts.cc=cc;
    // Render the signing invitation as a branded email. Keep the original
    // plain-text body as the accessible fallback and leave all other mail routes intact.
    if(subject==='Please Sign Your Application — Vancouver Finance Company'){
      var signingLink=body.match(/https:\/\/www\.vancouverfinancecompany\.com\/sign\/\?token=[a-f0-9]{64}(?![a-f0-9])/);
      if(signingLink){
        var htmlEscape=function(value){return String(value).replace(/[&<>"']/g,function(ch){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch];});};
        var greeting=body.split(/\r?\n/)[0];
        var safeLink=htmlEscape(signingLink[0]);
        opts.htmlBody='<div style="background:#f5f5f5;padding:24px 10px;font-family:Arial,sans-serif;color:#292929"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:auto;background:#fff;border:1px solid #ddd"><tr><td align="center" style="padding:22px 14px;background:#292929;color:#fff;font-family:Georgia,serif;font-size:17px">VANCOUVER FINANCE COMPANY INC.</td></tr><tr><td style="padding:28px 24px"><p style="font-size:11px;letter-spacing:2px;color:#777">ELECTRONIC APPLICATION</p><h1 style="font-family:Georgia,serif;font-weight:normal;font-size:28px;margin:0 0 22px">Review &amp; Sign</h1><p>'+htmlEscape(greeting)+'</p><p>Your financing application is ready for your review and electronic signature.</p><p>Review your business and applicant information, accept the consent and sign. No client account is required.</p><table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px auto"><tr><td bgcolor="#292929" style="border-radius:6px"><a href="'+safeLink+'" style="display:inline-block;padding:15px 24px;color:#fff;text-decoration:none;font-weight:bold">REVIEW &amp; SIGN APPLICATION</a></td></tr></table><p style="font-size:12px;color:#666;line-height:1.6">This confidential link expires in 72 hours. Please do not forward it. A signed PDF copy will be available after signing.</p><p style="font-size:12px;color:#666;overflow-wrap:anywhere">If the button does not work, open this link:<br><a href="'+safeLink+'" style="color:#444;word-break:break-all">'+safeLink+'</a></p></td></tr><tr><td align="center" style="padding:15px;border-top:1px solid #eee;color:#777;font-size:11px">Vancouver Finance Company Inc.<br>www.vancouverfinancecompany.com</td></tr></table></div>';
      }
    }
    if(payload.attachment){
      var b64=String(payload.attachment||'');
      if(b64.length>4200000||!/^[A-Za-z0-9+/=]+$/.test(b64))return reply({ok:false,error:'Invalid attachment'});
      var bytes=Utilities.base64Decode(b64);
      if(bytes.length>3000000||bytes.length<50)return reply({ok:false,error:'Invalid attachment size'});
      if(bytes[0]!==37||bytes[1]!==80||bytes[2]!==68||bytes[3]!==70)return reply({ok:false,error:'Only PDFs are accepted'});
      var name=String(payload.filename||'Signed-Application.pdf').replace(/[^\w .-]/g,'_').slice(0,110);
      if(!/\.pdf$/i.test(name))name+='.pdf';
      opts.attachments=[Utilities.newBlob(bytes,'application/pdf',name)];
    }
    if(MailApp.getRemainingDailyQuota()<(cc?2:1))return reply({ok:false,error:'Mail quota reached'});
    MailApp.sendEmail(to,subject,body,opts);
    console.log(JSON.stringify({event:'vfc_mail_sent',at:new Date().toISOString()}));
    return reply({ok:true});
  }catch(err){
    console.error(String(err));
    return reply({ok:false,error:'Mail service error'});
  }
}
