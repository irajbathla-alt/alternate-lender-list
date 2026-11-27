import {supabase} from '../lib/server'
import {uploadDocument} from '../app/actions'
export async function DocumentVault({applicationId,role}:{applicationId:string,role:'broker'|'client'|'admin'}){
 const s=await supabase();const {data:docs}=await s.from('documents').select('id,original_filename,category,scan_status,storage_path,created_at,uploaded_by').eq('application_id',applicationId).order('created_at',{ascending:false});
 const links=await Promise.all((docs||[]).map(async d=>{const {data}=await s.storage.from('application-documents').createSignedUrl(d.storage_path,60);return {...d,url:data?.signedUrl||null}}));
 return <section className="card"><h2>Secure Document Vault</h2><p className="muted small">Only PDFs, JPG and PNG (20 MB maximum). New uploads are private and pending security review before they can be shared with other users.</p>
 <form action={uploadDocument}><input type="hidden" name="application" value={applicationId}/><div className="field"><label>Document Category</label><select name="category">
 {['bank_statements','identification','financial_statements','business_registration','tax_documents','property_documents','application','proposal','other'].map(c=><option key={c} value={c}>{c.replaceAll('_',' ')}</option>)}
 </select></div>
 {role!=='client'&&<div className="field"><label>Sharing</label><select name="visibility"><option value="broker_client">Broker &amp; Client</option><option value="broker_admin">Broker &amp; Admin</option>{role==='admin'&&<option value="admin_only">Admin only</option>}</select></div>}
 <div className="field"><label>Select File</label><input type="file" name="document" accept=".pdf,.jpg,.jpeg,.png" required/></div><button className="btn">Upload Securely</button></form>
 <hr className="line"/><h3>Documents · {links.length}</h3>
 {links.length?links.map(d=><div className="item" key={d.id}><div style={{minWidth:0}}><b style={{overflowWrap:'anywhere'}}>{d.original_filename}</b><span className="muted small">{d.category.replaceAll('_',' ')} · {d.scan_status==='clean'?'Verified':'Pending verification'}</span></div>{d.url?<a className="btn secondary small" href={d.url} target="_blank" rel="noopener noreferrer">Download</a>:<span className="muted small">Restricted</span>}</div>):<p className="muted">No documents uploaded.</p>}
 </section>
}
