'use strict';
const EVENTS=Object.freeze({
 'demo-bmw':{name:'BMW Product Showcase',brand:'BMW',models:['X3','X5','X7','iX','M340i','Other']},
 'demo-cadillac':{name:'Cadillac Auto Experience',brand:'Cadillac',models:['OPTIQ','VISTIQ','CT5-V','Escalade','Other']},
 'demo-training':{name:'B2E Field Training',brand:'B2E / Training',models:['SUV','Sedan','EV','Pickup','Other']}
});
const HEADERS=Object.freeze(['Submitted At UTC','Lead ID','Event ID','Event Name','Brand / Client','First Name','Last Name','Email','Phone','ZIP','Current Vehicle','Vehicle of Interest','Purchase Timeline','Vehicle Condition','Requested Follow-Up','Information Sharing Consent','Consent Recorded At UTC','Staff Initials','Interaction Notes','Session Seconds','Registration Source','Test Data']);
const TIMELINES=['','Immediately','Within 1 month','Within 3 months','Within 6 months','Within 12 months','12+ months','Just exploring'];
const CONDITIONS=['','New','Used','Open to both'];
function clean(value,length){return String(value==null?'':value).trim().slice(0,length);}
function validate(payload){
 if(!payload||typeof payload!=='object'||Array.isArray(payload))throw Object.assign(new Error('A lead object is required.'),{status:400});
 const event=EVENTS[payload.eventId];if(!event)throw Object.assign(new Error('Unknown demo event.'),{status:400});
 const lead={
   leadId:clean(payload.leadId,70),eventId:payload.eventId,eventName:event.name,brand:event.brand,
   firstName:clean(payload.firstName,80),lastName:clean(payload.lastName,80),
   email:clean(payload.email,160).toLowerCase(),phone:clean(payload.phone,30),zip:clean(payload.zip,10),
   currentVehicle:clean(payload.currentVehicle,100),vehicleInterest:clean(payload.vehicleInterest,120),
   purchaseTimeline:clean(payload.purchaseTimeline,40),vehicleCondition:clean(payload.vehicleCondition,40),
   staffInitials:clean(payload.staffInitials,8),notes:clean(payload.notes,700),
   sessionSeconds:Math.min(36000,Math.max(0,Math.floor(Number(payload.sessionSeconds)||0))),
   shareConsent:payload.shareConsent===true,followupRequested:payload.followupRequested===true,
   source:'staff-assisted',isDemo:payload.isDemo===true
 };
 const bad=message=>{throw Object.assign(new Error(message),{status:400});};
 if(!/^DEMO-[A-Z0-9]+-[A-Z0-9]+$/.test(lead.leadId))bad('Invalid demo lead ID.');
 if(!lead.firstName||!lead.lastName||!lead.currentVehicle)bad('Name and current vehicle are required.');
 if(!/^[a-z0-9._%+\-]+@example\.(com|test)$/i.test(lead.email))bad('Pilot only: use a fictional @example.com or @example.test address.');
 if(!/^(1)?[0-9]{3}55501[0-9]{2}$/.test(lead.phone.replace(/\D/g,'')))bad('Pilot only: enter a fictional 555-01xx phone number.');
 if(!/^\d{5}$/.test(lead.zip))bad('Enter a five-digit ZIP.');
 if(!lead.shareConsent||!lead.isDemo)bad('Acknowledgment and demonstration mode required.');
 if(!event.models.includes(lead.vehicleInterest)&&lead.vehicleInterest!=='')bad('Unknown model for this event.');
 if(!TIMELINES.includes(lead.purchaseTimeline)||!CONDITIONS.includes(lead.vehicleCondition))bad('Invalid selection.');
 return lead;
}
function safeCell(value){const text=String(value??'');return /^[\s]*[=+@\-]/.test(text)?"'"+text:text;}
function rowForLead(lead,now=new Date().toISOString()){
 const values=[now,lead.leadId,lead.eventId,lead.eventName,lead.brand,lead.firstName,lead.lastName,lead.email,lead.phone,lead.zip,lead.currentVehicle,lead.vehicleInterest,lead.purchaseTimeline,lead.vehicleCondition,lead.followupRequested?'Yes':'No','Confirmed by staff',now,lead.staffInitials,lead.notes,lead.sessionSeconds,'Staff assisted','YES — FICTIONAL TEST ONLY'];
 return values.map((v)=>typeof v==='number'?v:safeCell(v));
}
module.exports={HEADERS,EVENTS,validate,rowForLead,safeCell};
