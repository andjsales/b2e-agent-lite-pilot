'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {validate,rowForLead}=require('../lib/lead.cjs');
const {appendLead,accessToken,federationConfig}=require('../lib/google-sheets.cjs');
const testLead={eventId:'demo-bmw',leadId:'DEMO-GOOGLE-ABC123',firstName:'Jordan',lastName:'Sample',email:'jordan.sample@example.com',phone:'202-555-0148',zip:'10001',currentVehicle:'Honda Civic',vehicleInterest:'X5',purchaseTimeline:'Within 3 months',vehicleCondition:'New',staffInitials:'AS',notes:'Fictional',shareConsent:true,followupRequested:true,isDemo:true,sessionSeconds:14};
const env={GOOGLE_SPREADSHEET_ID:'1mxBlgn_hS-vfljMtdAnlIGcH_2udey7lMKVVB2yTgxs',GCP_PROJECT_NUMBER:'123456789012',GCP_WORKLOAD_IDENTITY_POOL_ID:'vercel',GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID:'vercel',GCP_SERVICE_ACCOUNT_EMAIL:'pilot@test-project.iam.gserviceaccount.com',MOCK_SHEETS:'0'};
test('Google WIF exchange, impersonation, duplicate lookup, and append request',async()=>{
 const calls=[];
 const fetcher=async(url,options={})=>{calls.push({url,options});
  if(url==='https://sts.googleapis.com/v1/token')return {ok:true,json:async()=>({access_token:'federated-token'})};
  if(url.includes('generateAccessToken'))return {ok:true,json:async()=>({accessToken:'service-account-short-lived-token'})};
  if(url.includes('B2%3AB'))return {ok:true,json:async()=>({range:'Leads!B2:B',values:[]})};
  if(url.includes('A1%3AV:append'))return {ok:true,json:async()=>({updates:{updatedRows:1}})};
  throw new Error('Unexpected URL '+url);
 };
 const lead=validate(testLead),row=rowForLead(lead),result=await appendLead(lead,null,row,{env,fetcher,oidcToken:'fake-vercel-oidc'});
 assert.equal(result.ok,true);assert.equal(result.duplicate,false);assert.equal(calls.length,4);
 const tokenBody=new URLSearchParams(calls[0].options.body.toString());
 assert.equal(tokenBody.get('subject_token'),'fake-vercel-oidc');
 assert.equal(tokenBody.get('audience'),'//iam.googleapis.com/projects/123456789012/locations/global/workloadIdentityPools/vercel/providers/vercel');
 assert.equal(calls[1].options.headers.Authorization,'Bearer federated-token');
 assert.deepEqual(JSON.parse(calls[1].options.body).scope,['https://www.googleapis.com/auth/spreadsheets']);
 assert.equal(calls[2].options.headers.Authorization,'Bearer service-account-short-lived-token');
 assert.equal(calls[3].options.method,'POST');
 assert.match(calls[3].url, /:append\?valueInputOption=RAW/);
 assert.equal(JSON.parse(calls[3].options.body).values[0].length,22);
});
test('missing Vercel identity token is rejected without Google API call',async()=>{
 await assert.rejects(accessToken({env,fetcher:async()=>{throw new Error('unexpected network call')}}),/token missing/i);
});
test('configuration requires numeric Google project number and valid service account email',()=>{
 assert.throws(()=>federationConfig({...env,GCP_PROJECT_NUMBER:'invalid'}),/numeric/);
 assert.throws(()=>federationConfig({...env,GCP_SERVICE_ACCOUNT_EMAIL:'invalid@example.com'}),/GCP_SERVICE_ACCOUNT_EMAIL/);
});
