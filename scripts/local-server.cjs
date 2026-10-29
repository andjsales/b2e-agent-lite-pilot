'use strict';
// Local API simulator for smoke testing WITHOUT Google access. Never use as production server.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const handler=require('../api/leads.js');
process.env.NODE_ENV='development';process.env.MOCK_SHEETS='1';
process.env.PILOT_ACCESS_CODE=process.env.PILOT_ACCESS_CODE||'change-me-demo-code-12345';
const html=fs.readFileSync(path.join(__dirname,'../index.html'));
const port=Number(process.env.PORT||4173);
const server=http.createServer(async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');
 if(req.url==='/api/leads'){
   let content='';try{for await(const chunk of req){content+=chunk;if(content.length>14000)break;}}
   catch(_){res.writeHead(400).end('Bad input');return;}
   req.body=content;await handler(req,res);return;
 }
 if(req.method==='GET'&&['/','/index.html'].includes(req.url)){
   res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(html);return;
 }
 res.writeHead(404).end('Not found');
});
server.listen(port,()=>console.log('Local MOCK-SHEETS preview at http://localhost:'+port+'\nAccess code: '+process.env.PILOT_ACCESS_CODE+'\nNo real Google Sheet is written.'));
