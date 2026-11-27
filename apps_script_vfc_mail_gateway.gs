/**
 * VFC Mail Gateway — deploy as a SEPARATE Google Apps Script web app.
 * Execute as: Me. Access: Anyone (requests authenticate with shared secret).
 * Set Script Property: VFC_MAIL_SHARED_SECRET = long random value.
 * Set the matching secret in Supabase Edge Function environment:
 *   VFC_APPS_SCRIPT_SECRET = same random value
 *   VFC_APPS_SCRIPT_URL = deployed .../exec URL
 *
 * NEVER put VFC_MAIL_SHARED_SECRET inside GitHub, browser code or email drafts.
 * The deployed account will be the email sender (MailApp account).
 */
function doPost(e) {
  function reply(obj){return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);}
  try {
    var payload=JSON.parse((e&&e.postData&&e.postData.contents)||'{}');
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
    var lock=LockService.getScriptLock();lock.waitLock(10000);
    try{
      if(MailApp.getRemainingDailyQuota()<(cc?2:1))return reply({ok:false,error:'Mail quota reached'});
      MailApp.sendEmail(to,subject,body,opts);
      console.log(JSON.stringify({event:'vfc_mail_sent',to:to,at:new Date().toISOString(),subject:subject.slice(0,80)}));
    }finally{lock.releaseLock()}
    return reply({ok:true});
  }catch(err){
    console.error(String(err));
    return reply({ok:false,error:'Mail service error'});
  }
}
