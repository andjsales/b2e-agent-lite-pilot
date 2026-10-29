'use strict';
const crypto=require('node:crypto');
const {validate,rowForLead}=require('../lib/lead.cjs');
const {appendLead}=require('../lib/google-sheets.cjs');
function json(res,status,body){res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.end(JSON.stringify(body));}
function equalsSecure(a,b){const left=crypto.createHash('sha256').update(String(a)).digest(),right=crypto.createHash('sha256').update(String(b)).digest();return crypto.timingSafeEqual(left,right);}
module.exports=async function handler(req,res){
 if(req.method!=='POST'){res.setHeader('Allow','POST');return json(res,405,{ok:false,message:'POST is required.'});}
 if(!process.env.PILOT_ACCESS_CODE||process.env.PILOT_ACCESS_CODE.length<16)return json(res,503,{ok:false,message:'The pilot access code has not been configured on the server.'});
 if(!equalsSecure(req.headers['x-pilot-access']||'',process.env.PILOT_ACCESS_CODE))return json(res,401,{ok:false,message:'Invalid pilot access code.'});
 if(!(req.headers['content-type']||'').toLowerCase().startsWith('application/json'))return json(res,415,{ok:false,message:'Send JSON data.'});
 try{
   let input=req.body;
   if(typeof input==='string'){if(Buffer.byteLength(input)>14000)return json(res,413,{ok:false,message:'Lead payload is too large.'});input=JSON.parse(input);}
   if(!input||Buffer.byteLength(JSON.stringify(input))>14000)return json(res,413,{ok:false,message:'Lead payload is too large.'});
   const lead=validate(input),row=rowForLead(lead),result=await appendLead(lead,null,row,{oidcToken:req.headers['x-vercel-oidc-token']});
   return json(res,200,result);
 }catch(error){
   if(error instanceof SyntaxError)return json(res,400,{ok:false,message:'Invalid JSON.'});
   if(error.status===400)return json(res,400,{ok:false,message:error.message});
   console.error('AGENT Lite demo save failed:',error.message); // Never log lead data or credentials.
   return json(res,503,{ok:false,message:'Could not save to Google Sheets. Check Workload Identity Federation, spreadsheet sharing and server configuration.'});
 }
};
