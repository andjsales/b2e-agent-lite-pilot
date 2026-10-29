'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {validate,rowForLead,HEADERS,safeCell}=require('../lib/lead.cjs');
const handler=require('../api/leads.js');
const example={eventId:'demo-bmw',leadId:'DEMO-ABC12-12345',firstName:'Jordan',lastName:'Sample',email:'jordan.sample@example.com',phone:'202-555-0148',zip:'10001',currentVehicle:'Honda Civic',vehicleInterest:'X5',purchaseTimeline:'Within 3 months',vehicleCondition:'New',staffInitials:'AS',notes:'Asked about X5.',shareConsent:true,followupRequested:true,isDemo:true,sessionSeconds:63};
function req(data,code='test-code-at-least-16'){return {method:'POST',headers:{'x-pilot-access':code,'content-type':'application/json'},body:JSON.stringify(data)}}
async function run(request){let result;const response={statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v},end(s){result={status:this.statusCode,body:JSON.parse(s)};}};await handler(request,response);return result}
test('all 22 sheet headers match row cells',()=>{const l=validate(example);const r=rowForLead(l);assert.equal(r.length,HEADERS.length);assert.equal(r[1],example.leadId);assert.equal(r[7],example.email);});
test('rejects real email, real-looking phone, missing consent, unknown event',()=>{for(const changes of [{email:'real@gmail.com'},{phone:'212-555-2299'},{shareConsent:false},{eventId:'new-fake'}]){assert.throws(()=>validate({...example,...changes}));}});
test('prevents CSV formula injection',()=>assert.equal(safeCell('=IMPORTXML(1)'),"'=IMPORTXML(1)"));
test('mock endpoint writes fake lead, catches exact repeat lead ID',async()=>{process.env.PILOT_ACCESS_CODE='test-code-at-least-16';process.env.MOCK_SHEETS='1';process.env.NODE_ENV='test';globalThis.__b2eMockRows=[];const a=await run(req(example)),b=await run(req(example));assert.equal(a.status,200);assert.equal(a.body.ok,true);assert.equal(a.body.duplicate,false);assert.equal(b.body.duplicate,true);assert.equal(globalThis.__b2eMockRows.length,1);});
test('wrong access code rejected',async()=>{const r=await run(req(example,'wrong'));assert.equal(r.status,401)});
test('rejects non-JSON payloads, never silently saves locally',async()=>{const r=await run({...req(example),headers:{'x-pilot-access':'test-code-at-least-16','content-type':'text/plain'}});assert.equal(r.status,415)});
