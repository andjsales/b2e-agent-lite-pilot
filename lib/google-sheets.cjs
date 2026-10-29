'use strict';
const crypto=require('node:crypto');
const SCOPE='https://www.googleapis.com/auth/spreadsheets';
const AUD='https://oauth2.googleapis.com/token';
function credentialsFromEnv(env=process.env){
 const json=env.GOOGLE_SERVICE_ACCOUNT_JSON;
 if(!json)throw new Error('Google service account JSON is not configured.');
 let obj;try{obj=JSON.parse(json)}catch(_){throw new Error('Service account JSON is not valid JSON.');}
 if(!obj.client_email || !obj.private_key || !obj.private_key.includes('BEGIN PRIVATE KEY'))throw new Error('Service account email or private key missing.');
 return obj;
}
function encode(payload){return Buffer.from(JSON.stringify(payload)).toString('base64url');}
async function accessToken(env=process.env,fetcher=fetch){
 const obj=credentialsFromEnv(env);const now=Math.floor(Date.now()/1000);
 const unsigned=encode({alg:'RS256',typ:'JWT'})+'.'+encode({iss:obj.client_email,scope:SCOPE,aud:AUD,iat:now,exp:now+3600});
 const signature=crypto.sign('RSA-SHA256',Buffer.from(unsigned),obj.private_key).toString('base64url');
 const response=await fetcher(AUD,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:unsigned+'.'+signature})});
 if(!response.ok)throw new Error('Google service account authorization failed. Verify the key and Sheets API access.');
 const data=await response.json();if(!data.access_token)throw new Error('Google did not return an access token.');
 return data.access_token;
}
async function googleRequest(path,token,opts={},fetcher=fetch){
 const response=await fetcher('https://sheets.googleapis.com/v4/spreadsheets/'+path,{...opts,headers:{Authorization:'Bearer '+token,...(opts.headers||{})}});
 if(!response.ok){
   const error=new Error('Google Sheets request failed with status '+response.status+'. Check spreadsheet permissions, tab name, and API enablement.');
   error.googleStatus=response.status;throw error;
 }
 return response.json();
}
async function appendLead(lead,headers,row,{env=process.env,fetcher=fetch}={}){
 if(env.MOCK_SHEETS==='1'&&env.NODE_ENV!=='production'){
   const store=globalThis.__b2eMockRows??(globalThis.__b2eMockRows=[]);
   const duplicate=store.some(item=>item.leadId===lead.leadId);
   if(!duplicate)store.push({leadId:lead.leadId,row});
   return {ok:true,leadId:lead.leadId,duplicate,mock:true};
 }
 const id=env.GOOGLE_SPREADSHEET_ID;
 if(!id||!/^[a-zA-Z0-9_-]{15,}$/.test(id))throw new Error('GOOGLE_SPREADSHEET_ID is not configured.');
 const token=await accessToken(env,fetcher);
 const query=encodeURIComponent("'Leads'!B2:B");
 const existing=await googleRequest(encodeURIComponent(id)+'/values/'+query,token,{},fetcher);
 const duplicate=(existing.values||[]).some(row=>String(row[0])===lead.leadId);
 if(duplicate)return {ok:true,leadId:lead.leadId,duplicate:true};
 const result=await googleRequest(encodeURIComponent(id)+'/values/'+encodeURIComponent("'Leads'!A1:V")+':append?valueInputOption=RAW&insertDataOption=INSERT_ROWS',token,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({majorDimension:'ROWS',values:[row]})},fetcher);
 if(!result.updates||result.updates.updatedRows!==1)throw new Error('Google Sheets did not confirm exactly one saved row.');
 return {ok:true,leadId:lead.leadId,duplicate:false};
}
module.exports={credentialsFromEnv,accessToken,appendLead};
