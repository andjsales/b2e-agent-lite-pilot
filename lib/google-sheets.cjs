'use strict';
const SCOPE='https://www.googleapis.com/auth/spreadsheets';
const STS='https://sts.googleapis.com/v1/token';
const IAM='https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/';
function federationConfig(env=process.env){
 const keys=['GCP_PROJECT_NUMBER','GCP_WORKLOAD_IDENTITY_POOL_ID','GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID','GCP_SERVICE_ACCOUNT_EMAIL'];
 for(const key of keys){if(!env[key])throw new Error(key+' is not configured.');}
 if(!/^\d+$/.test(env.GCP_PROJECT_NUMBER))throw new Error('GCP_PROJECT_NUMBER must be numeric.');
 for(const key of keys.slice(1,3))if(!/^[a-z][a-z0-9-]{2,62}$/.test(env[key]))throw new Error('Invalid '+key+'.');
 if(!/^[^\s@]+@[^\s@]+\.iam\.gserviceaccount\.com$/.test(env.GCP_SERVICE_ACCOUNT_EMAIL))throw new Error('Invalid GCP_SERVICE_ACCOUNT_EMAIL.');
 return {
  audience:'//iam.googleapis.com/projects/'+env.GCP_PROJECT_NUMBER+'/locations/global/workloadIdentityPools/'+env.GCP_WORKLOAD_IDENTITY_POOL_ID+'/providers/'+env.GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID,
  email:env.GCP_SERVICE_ACCOUNT_EMAIL,
 };
}
async function accessToken({env=process.env,fetcher=fetch,oidcToken}={}){
 const {audience,email}=federationConfig(env);
 // In Vercel Functions, the runtime supplies this via the request header.
 // Never accept this value from a browser-facing request body.
 const identity=oidcToken || (env.NODE_ENV!=='production'?env.VERCEL_OIDC_TOKEN:null);
 if(!identity || typeof identity!=='string')throw new Error('Vercel OIDC token missing from function request.');
 const stsRes=await fetcher(STS,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({
   audience,
   grant_type:'urn:ietf:params:oauth:grant-type:token-exchange',
   requested_token_type:'urn:ietf:params:oauth:token-type:access_token',
   subject_token_type:'urn:ietf:params:oauth:token-type:jwt',
   subject_token:identity,
   scope:'https://www.googleapis.com/auth/cloud-platform',
 })});
 if(!stsRes.ok)throw new Error('Google Workload Identity Federation exchange failed (HTTP '+stsRes.status+'). Check provider issuer, audience, and token subject.');
 const sts=await stsRes.json();
 if(!sts.access_token)throw new Error('Google STS did not issue a federated token.');
 const iamRes=await fetcher(IAM+encodeURIComponent(email)+':generateAccessToken',{method:'POST',headers:{Authorization:'Bearer '+sts.access_token,'Content-Type':'application/json'},body:JSON.stringify({scope:[SCOPE],lifetime:'3600s'})});
 if(!iamRes.ok)throw new Error('Google service account impersonation failed (HTTP '+iamRes.status+'). Check roles/iam.workloadIdentityUser and IAM Credentials API.');
 const iam=await iamRes.json();
 if(!iam.accessToken)throw new Error('Google IAM Credentials did not return an access token.');
 return iam.accessToken;
}
async function googleRequest(path,token,opts={},fetcher=fetch){
 const response=await fetcher('https://sheets.googleapis.com/v4/spreadsheets/'+path,{...opts,headers:{Authorization:'Bearer '+token,...(opts.headers||{})}});
 if(!response.ok){
   const error=new Error('Google Sheets request failed with status '+response.status+'. Check spreadsheet permissions, tab name, and API enablement.');
   error.googleStatus=response.status;throw error;
 }
 return response.json();
}
async function appendLead(lead,headers,row,{env=process.env,fetcher=fetch,oidcToken}={}){
 if(env.MOCK_SHEETS==='1'&&env.NODE_ENV!=='production'){
   const store=globalThis.__b2eMockRows??(globalThis.__b2eMockRows=[]);
   const duplicate=store.some(item=>item.leadId===lead.leadId);
   if(!duplicate)store.push({leadId:lead.leadId,row});
   return {ok:true,leadId:lead.leadId,duplicate,mock:true};
 }
 const id=env.GOOGLE_SPREADSHEET_ID;
 if(!id||!/^[a-zA-Z0-9_-]{15,}$/.test(id))throw new Error('GOOGLE_SPREADSHEET_ID is not configured.');
 const token=await accessToken({env,fetcher,oidcToken});
 const query=encodeURIComponent("'Leads'!B2:B");
 const existing=await googleRequest(encodeURIComponent(id)+'/values/'+query,token,{},fetcher);
 const duplicate=(existing.values||[]).some(row=>String(row[0])===lead.leadId);
 if(duplicate)return {ok:true,leadId:lead.leadId,duplicate:true};
 const result=await googleRequest(encodeURIComponent(id)+'/values/'+encodeURIComponent("'Leads'!A1:V")+':append?valueInputOption=RAW&insertDataOption=INSERT_ROWS',token,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({majorDimension:'ROWS',values:[row]})},fetcher);
 if(!result.updates||result.updates.updatedRows!==1)throw new Error('Google Sheets did not confirm exactly one saved row.');
 return {ok:true,leadId:lead.leadId,duplicate:false};
}
module.exports={federationConfig,accessToken,appendLead};
