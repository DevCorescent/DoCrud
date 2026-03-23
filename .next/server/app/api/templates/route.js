"use strict";(()=>{var e={};e.id=412,e.ids=[412],e.modules={20399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},57147:e=>{e.exports=require("fs")},71017:e=>{e.exports=require("path")},6469:(e,t,a)=>{a.r(t),a.d(t,{originalPathname:()=>_,patchFetch:()=>b,requestAsyncStorage:()=>y,routeModule:()=>h,serverHooks:()=>u,staticGenerationAsyncStorage:()=>g});var i={};a.r(i),a.d(i,{GET:()=>c});var r=a(49303),n=a(88716),o=a(60670),s=a(87070),p=a(57147),l=a(71017),d=a.n(l);let m=[{id:"appointment-letter",name:"Appointment Letter",category:"HR",fields:[{id:"employeeName",name:"employeeName",label:"Employee Name",type:"text",required:!0,order:1},{id:"position",name:"position",label:"Position",type:"text",required:!0,order:2},{id:"department",name:"department",label:"Department",type:"text",required:!0,order:3},{id:"startDate",name:"startDate",label:"Start Date",type:"date",required:!0,order:4},{id:"salary",name:"salary",label:"Salary",type:"number",required:!0,order:5},{id:"companyName",name:"companyName",label:"Company Name",type:"text",required:!0,order:6},{id:"companyAddress",name:"companyAddress",label:"Company Address",type:"textarea",required:!0,order:7}],template:`
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Appointment Letter</title>
<style>
body { font-family: 'Times New Roman', serif; margin: 40px; line-height: 1.6; color: #333; }
.header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 30px; }
.content { margin-bottom: 20px; }
.signature { margin-top: 50px; text-align: left; }
.signature div { margin-bottom: 20px; }
</style>
</head>
<body>
<div class="header">
<h1>{{companyName}}</h1>
<p>{{companyAddress}}</p>
<p>Phone: [Company Phone] | Email: [Company Email]</p>
</div>
<div class="content">
<p><strong>Date:</strong> {{startDate}}</p>
<p><strong>To:</strong></p>
<p>{{employeeName}}</p>
<p>{{companyAddress}}</p>
<br>
<p><strong>Subject: Appointment as {{position}} in {{department}}</strong></p>
<br>
<p>Dear {{employeeName}},</p>
<p>We are pleased to inform you that you have been appointed as <strong>{{position}}</strong> in the <strong>{{department}}</strong> department of {{companyName}}, effective {{startDate}}.</p>
<p><strong>1. Compensation:</strong> Your annual gross salary will be {{salary}}. This includes basic salary, HRA, conveyance allowance, LTA, and other benefits as per company policy.</p>
<p><strong>2. Probation Period:</strong> You will be on probation for 6 months from the date of joining. During this period, your performance will be reviewed.</p>
<p><strong>3. Working Hours:</strong> The standard working hours are 9:00 AM to 6:00 PM, Monday to Friday, with one hour lunch break.</p>
<p><strong>4. Leave Policy:</strong> You will be entitled to 20 days of annual leave, 12 days of sick leave, and other leaves as per company policy.</p>
<p><strong>5. Confidentiality:</strong> You agree to maintain confidentiality of company information.</p>
<p><strong>6. Termination:</strong> Either party may terminate this employment with one month's notice.</p>
<p>Please sign and return this letter as acceptance of your appointment.</p>
<br>
<p>Yours sincerely,</p>
<div class="signature">
<div>
<p>[Authorized Signatory]</p>
<p>{{companyName}}</p>
<p>Date: {{startDate}}</p>
</div>
</div>
<br>
<p><strong>Acceptance:</strong></p>
<div class="signature">
<div>
<p>{{employeeName}}</p>
<p>Date: ________</p>
</div>
</div>
</div>
</body>
</html>
`,isCustom:!1,createdAt:"2024-01-01T00:00:00.000Z",updatedAt:"2024-01-01T00:00:00.000Z",version:1},{id:"nda",name:"Non-Disclosure Agreement (NDA)",category:"Legal",fields:[{id:"party1",name:"party1",label:"Party 1 (Disclosing Party)",type:"text",required:!0,order:1},{id:"party2",name:"party2",label:"Party 2 (Receiving Party)",type:"text",required:!0,order:2},{id:"date",name:"date",label:"Date",type:"date",required:!0,order:3},{id:"confidentialInfo",name:"confidentialInfo",label:"Description of Confidential Information",type:"textarea",required:!0,order:4}],template:`
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Non-Disclosure Agreement</title>
<style>
body { font-family: 'Times New Roman', serif; margin: 40px; line-height: 1.6; color: #333; font-size: 12pt; }
.title { text-align: center; font-size: 24px; margin-bottom: 30px; text-decoration: underline; }
.section { margin-bottom: 20px; }
.signature { margin-top: 50px; display: flex; justify-content: space-between; }
h3 { font-size: 14pt; margin-top: 20px; margin-bottom: 10px; }
p { text-align: justify; margin-bottom: 10px; }
</style>
</head>
<body>
<div class="title">NON-DISCLOSURE AGREEMENT</div>
<div class="section">
<p>This Non-Disclosure Agreement (the "Agreement") is made and entered into as of {{date}} (the "Effective Date"), by and between:</p>
<p><strong>{{party1}}</strong>, a [legal entity type] organized and existing under the laws of [jurisdiction], with its principal place of business at [address] (hereinafter referred to as the "Disclosing Party"),</p>
<p>and</p>
<p><strong>{{party2}}</strong>, a [legal entity type] organized and existing under the laws of [jurisdiction], with its principal place of business at [address] (hereinafter referred to as the "Receiving Party").</p>
<p>The Disclosing Party and the Receiving Party are collectively referred to as the "Parties" and individually as a "Party".</p>
</div>
<div class="section">
<h3>1. DEFINITIONS</h3>
<p>1.1 "Confidential Information" means any information or material disclosed by the Disclosing Party to the Receiving Party, including but not limited to: {{confidentialInfo}}, whether disclosed orally, in writing, electronically, or by any other means. Confidential Information shall not include information that: (a) is or becomes publicly known through no fault of the Receiving Party; (b) is already known to the Receiving Party at the time of disclosure; (c) is independently developed by the Receiving Party without use of the Confidential Information; or (d) is lawfully obtained from a third party without breach of any confidentiality obligation.</p>
<p>1.2 "Purpose" means [describe the purpose for which the Confidential Information is being disclosed, e.g., evaluation of potential business relationship].</p>
</div>
<div class="section">
<h3>2. OBLIGATIONS OF THE RECEIVING PARTY</h3>
<p>2.1 The Receiving Party agrees to hold and maintain the Confidential Information in strict confidence and take all reasonable precautions to protect it against unauthorized disclosure, including measures at least as protective as those used for its own confidential information of similar importance.</p>
<p>2.2 The Receiving Party shall not disclose, reproduce, or disseminate the Confidential Information to any third party without the prior written consent of the Disclosing Party.</p>
<p>2.3 The Receiving Party shall use the Confidential Information solely for the Purpose and shall not use it for any other purpose, including but not limited to competitive purposes.</p>
<p>2.4 The Receiving Party shall limit access to the Confidential Information to its employees, agents, or advisors who have a need to know and are bound by similar confidentiality obligations.</p>
<p>2.5 The Receiving Party shall promptly notify the Disclosing Party of any unauthorized use or disclosure of the Confidential Information and cooperate fully in mitigating any such breach.</p>
</div>
<div class="section">
<h3>3. TERM</h3>
<p>3.1 This Agreement shall remain in effect for a period of five (5) years from the Effective Date, unless terminated earlier in accordance with this Agreement.</p>
<p>3.2 The obligations of confidentiality with respect to Confidential Information shall survive the termination or expiration of this Agreement for a period of ten (10) years thereafter.</p>
</div>
<div class="section">
<h3>4. RETURN OF CONFIDENTIAL INFORMATION</h3>
<p>Upon termination of this Agreement or at the request of the Disclosing Party, the Receiving Party shall promptly return or destroy all Confidential Information, including all copies, extracts, and derivatives thereof, and certify in writing to the Disclosing Party that such return or destruction has been completed.</p>
</div>
<div class="section">
<h3>5. REMEDIES</h3>
<p>The Receiving Party acknowledges that any breach of this Agreement may cause irreparable harm to the Disclosing Party for which monetary damages may be inadequate. Accordingly, the Receiving Party agrees that the Disclosing Party shall be entitled to seek injunctive relief, in addition to any other remedies available at law or in equity, without the necessity of posting bond or proving actual damages.</p>
</div>
<div class="section">
<h3>6. NO WARRANTY</h3>
<p>The Disclosing Party makes no warranty, express or implied, as to the accuracy, completeness, or usefulness of the Confidential Information. The Receiving Party acknowledges that it assumes all risks associated with the use of the Confidential Information.</p>
</div>
<div class="section">
<h3>7. GOVERNING LAW</h3>
<p>This Agreement shall be governed by and construed in accordance with the laws of [jurisdiction], without regard to its conflict of laws principles. Any legal action or proceeding arising under this Agreement shall be brought exclusively in the courts of [jurisdiction].</p>
</div>
<div class="section">
<h3>8. ENTIRE AGREEMENT</h3>
<p>This Agreement constitutes the entire understanding between the Parties with respect to the subject matter hereof and supersedes all prior agreements, whether written or oral, relating to the Confidential Information.</p>
</div>
<div class="section">
<h3>9. SEVERABILITY</h3>
<p>If any provision of this Agreement is held to be invalid or unenforceable under applicable law, the remaining provisions shall continue in full force and effect, and the Parties shall negotiate in good faith to replace such invalid or unenforceable provision with a valid and enforceable provision that achieves, to the greatest extent possible, the original intent of the Parties.</p>
</div>
<div class="section">
<h3>10. AMENDMENT</h3>
<p>This Agreement may be amended or modified only by a written instrument signed by both Parties.</p>
</div>
<div class="section">
<h3>11. WAIVER</h3>
<p>The failure of either Party to enforce any provision of this Agreement shall not constitute a waiver of such provision or of the right to enforce it at a later time.</p>
</div>
<div class="section">
<h3>12. INDEPENDENT CONTRACTORS</h3>
<p>Nothing in this Agreement shall be construed as creating a partnership, joint venture, or agency relationship between the Parties. Each Party is an independent contractor and neither Party has the authority to bind the other.</p>
</div>
<p>IN WITNESS WHEREOF, the Parties have executed this Agreement as of the Effective Date.</p>
<div class="signature">
<div>
<p>{{party1}}</p>
<p>By: ___________________________</p>
<p>Name: [Authorized Signatory]</p>
<p>Title: [Title]</p>
<p>Date: {{date}}</p>
</div>
<div>
<p>{{party2}}</p>
<p>By: ___________________________</p>
<p>Name: [Authorized Signatory]</p>
<p>Title: [Title]</p>
<p>Date: {{date}}</p>
</div>
</div>
</body>
</html>
`,isCustom:!1},{id:"employment-contract",name:"Employment Contract",fields:[{id:"employeeName",name:"employeeName",label:"Employee Name",type:"text",required:!0,order:1},{id:"employerName",name:"employerName",label:"Employer Name",type:"text",required:!0,order:2},{id:"position",name:"position",label:"Position",type:"text",required:!0,order:3},{id:"startDate",name:"startDate",label:"Start Date",type:"date",required:!0,order:4},{id:"salary",name:"salary",label:"Salary",type:"number",required:!0,order:5},{id:"duties",name:"duties",label:"Job Duties",type:"textarea",required:!0,order:6}],template:`
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Employment Contract</title>
<style>
body { font-family: 'Times New Roman', serif; margin: 40px; line-height: 1.6; color: #333; font-size: 12pt; }
.title { text-align: center; font-size: 24px; margin-bottom: 30px; text-decoration: underline; }
.section { margin-bottom: 20px; }
.signature { margin-top: 50px; display: flex; justify-content: space-between; }
h3 { font-size: 14pt; margin-top: 20px; margin-bottom: 10px; }
p { text-align: justify; margin-bottom: 10px; }
</style>
</head>
<body>
<div class="title">EMPLOYMENT CONTRACT</div>
<div class="section">
<p>This Employment Contract (the "Contract") is made and entered into as of {{startDate}} (the "Effective Date"), by and between:</p>
<p><strong>{{employerName}}</strong>, a company incorporated under the Companies Act, 2013, having its registered office at [address] (hereinafter referred to as the "Employer"),</p>
<p>and</p>
<p><strong>{{employeeName}}</strong>, residing at [address] (hereinafter referred to as the "Employee").</p>
</div>
<div class="section">
<h3>1. POSITION AND DUTIES</h3>
<p>1.1 The Employer hereby employs the Employee as {{position}}, and the Employee hereby accepts such employment.</p>
<p>1.2 The Employee shall perform the following duties: {{duties}}. The Employee shall devote full time, attention, and energies to the Employer's business and shall perform all duties faithfully and to the best of their ability.</p>
<p>1.3 The Employee shall comply with all reasonable instructions given by the Employer and shall not engage in any other employment or business activity without the prior written consent of the Employer.</p>
</div>
<div class="section">
<h3>2. COMPENSATION</h3>
<p>2.1 The Employer shall pay the Employee a monthly salary of {{salary}} ({{salary}} per annum), payable on the last working day of each month. The salary includes basic pay, House Rent Allowance (HRA), Conveyance Allowance, Leave Travel Allowance (LTA), and other benefits as per company policy.</p>
<p>2.2 The Employee shall be entitled to annual increments, bonuses, and other benefits as determined by the Employer from time to time.</p>
<p>2.3 All payments shall be subject to applicable tax deductions as per law.</p>
</div>
<div class="section">
<h3>3. WORKING HOURS AND LEAVE</h3>
<p>3.1 The Employee shall work from 9:00 AM to 6:00 PM, Monday to Saturday, with one hour lunch break. The Employer may require overtime work as necessary, with appropriate compensation.</p>
<p>3.2 The Employee is entitled to 20 days of annual leave, 12 days of sick leave, maternity/paternity leave as per applicable laws, and other leaves as per company policy.</p>
<p>3.3 Leave shall be taken with prior approval and shall not be carried forward beyond [number] days.</p>
</div>
<div class="section">
<h3>4. PROBATION</h3>
<p>4.1 The Employee shall serve a probation period of 6 months from the Effective Date. During probation, employment may be terminated with 15 days' notice by either party.</p>
<p>4.2 Upon successful completion of probation, the Employee shall be confirmed in employment with the terms of this Contract applying fully.</p>
</div>
<div class="section">
<h3>5. CONFIDENTIALITY AND NON-DISCLOSURE</h3>
<p>5.1 The Employee agrees to maintain strict confidentiality of all proprietary information, trade secrets, customer data, and other confidential matters of the Employer.</p>
<p>5.2 The Employee shall not disclose any confidential information to third parties or use it for personal gain during or after employment.</p>
<p>5.3 This obligation shall survive the termination of this Contract for a period of [number] years.</p>
</div>
<div class="section">
<h3>6. INTELLECTUAL PROPERTY</h3>
<p>6.1 Any work product, inventions, designs, software, or other intellectual property created by the Employee during employment, whether alone or jointly, shall be the sole property of the Employer.</p>
<p>6.2 The Employee hereby assigns all rights, title, and interest in such intellectual property to the Employer.</p>
</div>
<div class="section">
<h3>7. NON-COMPETE AND NON-SOLICITATION</h3>
<p>7.1 During employment and for a period of 1 year thereafter, the Employee shall not engage in any competing business or solicit the Employer's customers or employees.</p>
<p>7.2 The Employee acknowledges that this restriction is reasonable and necessary to protect the Employer's legitimate business interests.</p>
</div>
<div class="section">
<h3>8. DISCIPLINARY ACTION AND TERMINATION</h3>
<p>8.1 Either party may terminate this Contract with one month's notice in writing.</p>
<p>8.2 The Employer may terminate the Employee's employment without notice for gross misconduct, including but not limited to theft, fraud, or breach of confidentiality.</p>
<p>8.3 Upon termination, the Employee shall return all company property and settle all dues.</p>
<p>8.4 The Employee shall be entitled to notice pay or salary in lieu of notice, whichever is applicable.</p>
</div>
<div class="section">
<h3>9. GRIEVANCE PROCEDURE</h3>
<p>Any disputes arising under this Contract shall first be resolved through internal discussions. If unresolved, the matter may be referred to arbitration under the Arbitration and Conciliation Act, 1996.</p>
</div>
<div class="section">
<h3>10. GOVERNING LAW</h3>
<p>This Contract shall be governed by and construed in accordance with the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts in [city].</p>
</div>
<div class="section">
<h3>11. ENTIRE AGREEMENT</h3>
<p>This Contract constitutes the entire agreement between the parties and supersedes all prior understandings. It may be amended only in writing signed by both parties.</p>
</div>
<div class="section">
<h3>12. SEVERABILITY</h3>
<p>If any provision of this Contract is held invalid, the remaining provisions shall remain in full force and effect.</p>
</div>
<p>IN WITNESS WHEREOF, the parties have executed this Contract as of the Effective Date.</p>
<div class="signature">
<div>
<p>{{employerName}}</p>
<p>By: ___________________________</p>
<p>Name: [Authorized Signatory]</p>
<p>Title: [Title]</p>
<p>Date: {{startDate}}</p>
</div>
<div>
<p>{{employeeName}}</p>
<p>___________________________</p>
<p>Date: {{startDate}}</p>
</div>
</div>
</body>
</html>
`},{id:"offer-letter",name:"Offer Letter",fields:[{id:"candidateName",name:"candidateName",label:"Candidate Name",type:"text",required:!0,order:1},{id:"position",name:"position",label:"Position",type:"text",required:!0,order:2},{id:"salary",name:"salary",label:"Salary",type:"number",required:!0,order:3},{id:"startDate",name:"startDate",label:"Start Date",type:"date",required:!0,order:4},{id:"companyName",name:"companyName",label:"Company Name",type:"text",required:!0,order:5}],template:`
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Offer Letter</title>
<style>
body { font-family: 'Times New Roman', serif; margin: 40px; line-height: 1.6; color: #333; }
.header { text-align: center; margin-bottom: 30px; }
.content { margin-bottom: 20px; }
.signature { margin-top: 50px; }
</style>
</head>
<body>
<div class="header">
<h1>{{companyName}}</h1>
<p>{{companyAddress}}</p>
<p>Phone: [Company Phone] | Email: [Company Email]</p>
</div>
<div class="content">
<p><strong>Date:</strong> {{startDate}}</p>
<p><strong>To:</strong></p>
<p>{{candidateName}}</p>
<p>[Candidate Address]</p>
<br>
<p><strong>Subject: Offer of Employment as {{position}}</strong></p>
<br>
<p>Dear {{candidateName}},</p>
<p>We are pleased to extend an offer of employment for the position of {{position}} at {{companyName}}. This offer is contingent upon satisfactory completion of background checks and reference verification.</p>
<p><strong>1. Compensation:</strong> Your annual gross salary will be {{salary}}. This includes basic salary, HRA, conveyance allowance, LTA, and other benefits as per company policy.</p>
<p><strong>2. Start Date:</strong> Your employment will commence on {{startDate}}.</p>
<p><strong>3. Probation:</strong> You will be on probation for 6 months.</p>
<p><strong>4. Benefits:</strong> You will be eligible for health insurance, provident fund, gratuity, and other benefits as per company policy and applicable laws.</p>
<p><strong>5. Working Hours:</strong> Standard working hours are 9:00 AM to 6:00 PM, Monday to Friday.</p>
<p><strong>6. Location:</strong> Your primary work location will be {{companyAddress}}.</p>
<p>Please sign and return this letter by [deadline] to accept this offer.</p>
<br>
<p>Yours sincerely,</p>
<div class="signature">
<p>[Authorized Signatory]</p>
<p>{{companyName}}</p>
<p>Date: {{startDate}}</p>
</div>
<br>
<p><strong>Acceptance:</strong></p>
<div class="signature">
<p>{{candidateName}}</p>
<p>Date: ________</p>
</div>
</div>
</body>
</html>
`},{id:"invoice",name:"Invoice",fields:[{id:"invoiceNumber",name:"invoiceNumber",label:"Invoice Number",type:"text",required:!0,order:1},{id:"date",name:"date",label:"Date",type:"date",required:!0,order:2},{id:"clientName",name:"clientName",label:"Client Name",type:"text",required:!0,order:3},{id:"clientAddress",name:"clientAddress",label:"Client Address",type:"textarea",required:!0,order:4},{id:"companyName",name:"companyName",label:"Company Name",type:"text",required:!0,order:5},{id:"companyAddress",name:"companyAddress",label:"Company Address",type:"textarea",required:!0,order:6},{id:"items",name:"items",label:"Items",type:"textarea",required:!0,order:7},{id:"total",name:"total",label:"Total Amount",type:"number",required:!0,order:8}],template:`
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Invoice</title>
<style>
body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; color: #333; }
.header { text-align: center; margin-bottom: 30px; }
table { width: 100%; border-collapse: collapse; margin: 20px 0; }
th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
th { background-color: #f2f2f2; }
.total { text-align: right; font-weight: bold; }
</style>
</head>
<body>
<div class="header">
<h1>Invoice</h1>
<p><strong>Invoice Number:</strong> {{invoiceNumber}}</p>
<p><strong>Date:</strong> {{date}}</p>
<p><strong>Due Date:</strong> [Due Date]</p>
</div>
<div>
<p><strong>From:</strong></p>
<p>{{companyName}}</p>
<p>{{companyAddress}}</p>
<p>GSTIN: [GST Number]</p>
<p>PAN: [PAN Number]</p>
</div>
<div>
<p><strong>Bill To:</strong></p>
<p>{{clientName}}</p>
<p>{{clientAddress}}</p>
<p>GSTIN: [Client GST]</p>
</div>
<table>
<thead>
<tr>
<th>Description</th>
<th>Quantity</th>
<th>Unit Price</th>
<th>Amount</th>
</tr>
</thead>
<tbody>
<tr>
<td>{{items}}</td>
<td>[Quantity]</td>
<td>[Unit Price]</td>
<td>[Amount]</td>
</tr>
</tbody>
<tfoot>
<tr>
<td colspan="3" class="total">Subtotal:</td>
<td>[Subtotal]</td>
</tr>
<tr>
<td colspan="3" class="total">GST (18%):</td>
<td>[GST Amount]</td>
</tr>
<tr>
<td colspan="3" class="total">Total:</td>
<td>{{total}}</td>
</tr>
</tfoot>
</table>
<p><strong>Payment Terms:</strong> Payment due within 30 days of invoice date.</p>
<p><strong>Bank Details:</strong></p>
<p>Account Name: {{companyName}}</p>
<p>Account Number: [Account Number]</p>
<p>IFSC Code: [IFSC]</p>
<p>Bank: [Bank Name]</p>
<p>Thank you for your business!</p>
</body>
</html>
`},{id:"termination-letter",name:"Termination Letter",fields:[{id:"employeeName",name:"employeeName",label:"Employee Name",type:"text",required:!0,order:1},{id:"position",name:"position",label:"Position",type:"text",required:!0,order:2},{id:"terminationDate",name:"terminationDate",label:"Termination Date",type:"date",required:!0,order:3},{id:"reason",name:"reason",label:"Reason for Termination",type:"textarea",required:!0,order:4},{id:"companyName",name:"companyName",label:"Company Name",type:"text",required:!0,order:5}],template:`
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Termination Letter</title>
<style>
body { font-family: 'Times New Roman', serif; margin: 40px; line-height: 1.6; color: #333; }
.header { text-align: center; margin-bottom: 30px; }
.content { margin-bottom: 20px; }
.signature { margin-top: 50px; }
</style>
</head>
<body>
<div class="header">
<h1>{{companyName}}</h1>
<p>{{companyAddress}}</p>
<p>Phone: [Company Phone] | Email: [Company Email]</p>
</div>
<div class="content">
<p><strong>Date:</strong> {{terminationDate}}</p>
<p><strong>To:</strong></p>
<p>{{employeeName}}</p>
<p>[Employee Address]</p>
<br>
<p><strong>Subject: Termination of Employment</strong></p>
<br>
<p>Dear {{employeeName}},</p>
<p>This letter serves as formal notice of termination of your employment as {{position}} at {{companyName}}, effective {{terminationDate}}.</p>
<p><strong>Reason for Termination:</strong> {{reason}}</p>
<p>As per your employment contract and applicable labor laws, you are entitled to the following:</p>
<ul>
<li>Salary for the notice period or payment in lieu thereof.</li>
<li>Gratuity, if applicable.</li>
<li>Encashment of unused leave.</li>
<li>Provident Fund and other benefits.</li>
</ul>
<p>Please return all company property, including ID cards, laptops, and access cards, by {{terminationDate}}.</p>
<p>We wish you the best in your future endeavors.</p>
<br>
<p>Yours sincerely,</p>
<div class="signature">
<p>[Authorized Signatory]</p>
<p>{{companyName}}</p>
<p>Date: {{terminationDate}}</p>
</div>
</div>
</body>
</html>
`},{id:"receipt",name:"Receipt",fields:[{name:"receiptNumber",label:"Receipt Number",type:"text",required:!0},{name:"date",label:"Date",type:"date",required:!0},{name:"receivedFrom",label:"Received From",type:"text",required:!0},{name:"amount",label:"Amount",type:"number",required:!0},{name:"forWhat",label:"For",type:"textarea",required:!0},{name:"companyName",label:"Company Name",type:"text",required:!0}],template:`
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Receipt</title>
<style>
body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; color: #333; }
.header { text-align: center; margin-bottom: 30px; }
.content { margin-bottom: 20px; }
.signature { margin-top: 50px; text-align: center; }
</style>
</head>
<body>
<div class="header">
<h1>{{companyName}}</h1>
<p>{{companyAddress}}</p>
<p>Phone: [Company Phone] | Email: [Company Email]</p>
</div>
<div class="content">
<p><strong>Receipt Number:</strong> {{receiptNumber}}</p>
<p><strong>Date:</strong> {{date}}</p>
<p><strong>Received From:</strong> {{receivedFrom}}</p>
<p><strong>Amount Received:</strong> {{amount}}</p>
<p><strong>For:</strong> {{forWhat}}</p>
<p><strong>Payment Method:</strong> [Cash/Cheque/Online Transfer]</p>
<p><strong>Received By:</strong> [Receiver Name]</p>
<p>This is to certify that the above amount has been received in full settlement of the mentioned purpose.</p>
<p>Thank you for your payment.</p>
</div>
<div class="signature">
<p>___________________________</p>
<p>{{companyName}}</p>
<p>Date: {{date}}</p>
</div>
</body>
</html>
`},{id:"board-resolution",name:"Board Resolution",fields:[{id:"companyName",name:"companyName",label:"Company Name",type:"text",required:!0,order:1},{id:"meetingDate",name:"meetingDate",label:"Meeting Date",type:"date",required:!0,order:2},{id:"resolution",name:"resolution",label:"Resolution Text",type:"textarea",required:!0,order:3}],template:`
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Board Resolution</title>
<style>
body { font-family: 'Times New Roman', serif; margin: 40px; line-height: 1.6; color: #333; }
.title { text-align: center; font-size: 24px; margin-bottom: 30px; }
.content { margin-bottom: 20px; }
.signature { margin-top: 50px; }
</style>
</head>
<body>
<div class="title">Board Resolution</div>
<div class="content">
<p><strong>Company:</strong> {{companyName}}</p>
<p><strong>Meeting Date:</strong> {{meetingDate}}</p>
<p><strong>Board Members Present:</strong> [List of members]</p>
<p><strong>Quorum:</strong> [Quorum details]</p>
<br>
<p><strong>Resolution:</strong></p>
<p>RESOLVED THAT {{resolution}}</p>
<br>
<p>RESOLVED FURTHER THAT [Authorized Signatory] be and is hereby authorized to sign all necessary documents and do all acts, deeds, and things as may be necessary to give effect to the above resolution.</p>
<br>
<p>Approved by the Board of Directors.</p>
</div>
<div class="signature">
<p>___________________________</p>
<p>Chairman/Director</p>
<p>{{companyName}}</p>
<p>Date: {{meetingDate}}</p>
</div>
</body>
</html>
`},{id:"resignation-letter",name:"Resignation Letter",fields:[{name:"employeeName",label:"Employee Name",type:"text",required:!0},{name:"position",label:"Position",type:"text",required:!0},{name:"lastWorkingDay",label:"Last Working Day",type:"date",required:!0},{name:"reason",label:"Reason for Resignation",type:"textarea",required:!1},{name:"companyName",label:"Company Name",type:"text",required:!0}],template:`
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Resignation Letter</title>
<style>
body { font-family: 'Times New Roman', serif; margin: 40px; line-height: 1.6; color: #333; }
.header { text-align: center; margin-bottom: 30px; }
.content { margin-bottom: 20px; }
.signature { margin-top: 50px; }
</style>
</head>
<body>
<div class="header">
<h1>{{companyName}}</h1>
<p>{{companyAddress}}</p>
<p>Phone: [Company Phone] | Email: [Company Email]</p>
</div>
<div class="content">
<p><strong>Date:</strong> {{lastWorkingDay}}</p>
<p><strong>To:</strong></p>
<p>The Human Resources Manager</p>
<p>{{companyName}}</p>
<p>{{companyAddress}}</p>
<br>
<p><strong>Subject: Resignation from the Position of {{position}}</strong></p>
<br>
<p>Dear Sir/Madam,</p>
<p>I, {{employeeName}}, hereby tender my resignation from the position of {{position}} at {{companyName}}, effective from {{lastWorkingDay}}.</p>
<p>{{reason}}</p>
<p>I assure you of my cooperation during the transition period and will ensure a smooth handover of my responsibilities.</p>
<p>I would like to express my gratitude for the opportunities provided and the support received during my tenure.</p>
<p>Thank you for the valuable experience and learning.</p>
<br>
<p>Yours sincerely,</p>
<div class="signature">
<p>{{employeeName}}</p>
<p>{{position}}</p>
<p>Date: {{lastWorkingDay}}</p>
</div>
</div>
</body>
</html>
`},{id:"performance-appraisal",name:"Performance Appraisal",fields:[{id:"employeeName",name:"employeeName",label:"Employee Name",type:"text",required:!0,order:1},{id:"position",name:"position",label:"Position",type:"text",required:!0,order:2},{id:"reviewPeriod",name:"reviewPeriod",label:"Review Period",type:"text",required:!0,order:3},{id:"overallRating",name:"overallRating",label:"Overall Rating",type:"text",required:!0,order:4},{id:"strengths",name:"strengths",label:"Strengths",type:"textarea",required:!0,order:5},{id:"areasForImprovement",name:"areasForImprovement",label:"Areas for Improvement",type:"textarea",required:!0,order:6},{id:"goals",name:"goals",label:"Future Goals",type:"textarea",required:!0,order:7},{id:"companyName",name:"companyName",label:"Company Name",type:"text",required:!0,order:8}],template:`
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Performance Appraisal</title>
<style>
body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; color: #333; }
.header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 10px; }
.section { margin-bottom: 20px; }
.section h3 { color: #555; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
.signature { margin-top: 50px; }
</style>
</head>
<body>
<div class="header">
<h1>{{companyName}}</h1>
<h2>Performance Appraisal Report</h2>
</div>
<div class="section">
<h3>Employee Details</h3>
<p><strong>Name:</strong> {{employeeName}}</p>
<p><strong>Position:</strong> {{position}}</p>
<p><strong>Review Period:</strong> {{reviewPeriod}}</p>
<p><strong>Overall Rating:</strong> {{overallRating}}/5</p>
</div>
<div class="section">
<h3>Strengths</h3>
<p>{{strengths}}</p>
</div>
<div class="section">
<h3>Areas for Improvement</h3>
<p>{{areasForImprovement}}</p>
</div>
<div class="section">
<h3>Goals for Next Period</h3>
<p>{{goals}}</p>
</div>
<div class="section">
<h3>Comments</h3>
<p>[Manager's Comments]</p>
</div>
<div class="signature">
<p>Reviewed by: ___________________________ Date: ________</p>
<p>Employee Signature: ___________________________ Date: ________</p>
</div>
</body>
</html>
`},{id:"loan-agreement",name:"Loan Agreement",fields:[{id:"lenderName",name:"lenderName",label:"Lender Name",type:"text",required:!0,order:1},{id:"borrowerName",name:"borrowerName",label:"Borrower Name",type:"text",required:!0,order:2},{id:"loanAmount",name:"loanAmount",label:"Loan Amount",type:"number",required:!0,order:3},{id:"interestRate",name:"interestRate",label:"Interest Rate (%)",type:"number",required:!0,order:4},{id:"repaymentPeriod",name:"repaymentPeriod",label:"Repayment Period",type:"text",required:!0,order:5},{id:"date",name:"date",label:"Agreement Date",type:"date",required:!0,order:6}],template:`
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Loan Agreement</title>
<style>
body { font-family: 'Times New Roman', serif; margin: 40px; line-height: 1.6; color: #333; }
.title { text-align: center; font-size: 24px; margin-bottom: 30px; text-decoration: underline; }
.parties { margin-bottom: 20px; }
.terms { margin-bottom: 20px; }
.signature { margin-top: 50px; display: flex; justify-content: space-between; }
</style>
</head>
<body>
<div class="title">Loan Agreement</div>
<div class="parties">
<p>This Loan Agreement (the "Agreement") is made and entered into as of {{date}} by and between:</p>
<p><strong>{{lenderName}}</strong>, residing at [address] ("Lender")</p>
<p>and</p>
<p><strong>{{borrowerName}}</strong>, residing at [address] ("Borrower")</p>
</div>
<div class="terms">
<h3>1. Loan Amount</h3>
<p>The Lender agrees to lend the Borrower the principal sum of {{loanAmount}} (the "Loan").</p>
<h3>2. Interest Rate</h3>
<p>The Loan shall bear interest at the rate of {{interestRate}}% per annum, compounded [monthly/quarterly/annually].</p>
<h3>3. Repayment Terms</h3>
<p>The Borrower shall repay the Loan in {{repaymentPeriod}}. Repayment shall commence from [start date] and continue until the Loan is fully repaid.</p>
<h3>4. Default</h3>
<p>If the Borrower fails to make any payment when due, the entire outstanding amount shall become immediately due and payable.</p>
<h3>5. Governing Law</h3>
<p>This Agreement shall be governed by the laws of [jurisdiction].</p>
</div>
<div class="signature">
<div>
<p>{{lenderName}}</p>
<p>___________________________</p>
<p>Date: {{date}}</p>
</div>
<div>
<p>{{borrowerName}}</p>
<p>___________________________</p>
<p>Date: {{date}}</p>
</div>
</div>
</body>
</html>
`},{id:"service-agreement",name:"Service Agreement",fields:[{name:"serviceProvider",label:"Service Provider",type:"text",required:!0},{name:"clientName",label:"Client Name",type:"text",required:!0},{name:"services",label:"Services Description",type:"textarea",required:!0},{name:"fee",label:"Service Fee",type:"number",required:!0},{name:"duration",label:"Agreement Duration",type:"text",required:!0},{name:"date",label:"Agreement Date",type:"date",required:!0}],template:`
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Service Agreement</title>
<style>
body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; color: #333; }
.title { text-align: center; font-size: 24px; margin-bottom: 30px; }
.section { margin-bottom: 20px; }
.signature { margin-top: 50px; display: flex; justify-content: space-between; }
</style>
</head>
<body>
<div class="title">Service Agreement</div>
<div class="section">
<p>This Service Agreement (the "Agreement") is entered into as of {{date}} by and between:</p>
<p><strong>{{serviceProvider}}</strong>, a [legal entity] with its principal place of business at [address] ("Service Provider")</p>
<p>and</p>
<p><strong>{{clientName}}</strong>, a [legal entity] with its principal place of business at [address] ("Client")</p>
</div>
<div class="section">
<h3>1. Services</h3>
<p>The Service Provider agrees to provide the following services: {{services}}</p>
</div>
<div class="section">
<h3>2. Compensation</h3>
<p>The Client agrees to pay the Service Provider {{fee}} for the services rendered. Payment terms: [e.g., 50% upfront, 50% on completion].</p>
</div>
<div class="section">
<h3>3. Term</h3>
<p>This Agreement shall commence on {{date}} and continue for {{duration}}, unless terminated earlier as provided herein.</p>
</div>
<div class="section">
<h3>4. Confidentiality</h3>
<p>Both parties agree to maintain confidentiality of proprietary information disclosed during the term of this Agreement.</p>
</div>
<div class="section">
<h3>5. Termination</h3>
<p>Either party may terminate this Agreement with 30 days' written notice. Immediate termination for material breach.</p>
</div>
<div class="section">
<h3>6. Governing Law</h3>
<p>This Agreement shall be governed by the laws of [jurisdiction].</p>
</div>
<div class="signature">
<div>
<p>{{serviceProvider}}</p>
<p>By: ___________________________</p>
<p>Name: [Name]</p>
<p>Title: [Title]</p>
<p>Date: {{date}}</p>
</div>
<div>
<p>{{clientName}}</p>
<p>By: ___________________________</p>
<p>Name: [Name]</p>
<p>Title: [Title]</p>
<p>Date: {{date}}</p>
</div>
</div>
</body>
</html>
`},{id:"partnership-agreement",name:"Partnership Agreement",fields:[{id:"partner1",name:"partner1",label:"Partner 1 Name",type:"text",required:!0,order:1},{id:"partner2",name:"partner2",label:"Partner 2 Name",type:"text",required:!0,order:2},{id:"businessName",name:"businessName",label:"Business Name",type:"text",required:!0,order:3},{id:"contribution1",name:"contribution1",label:"Partner 1 Contribution",type:"textarea",required:!0,order:4},{id:"contribution2",name:"contribution2",label:"Partner 2 Contribution",type:"textarea",required:!0,order:5},{id:"profitSharing",name:"profitSharing",label:"Profit Sharing Ratio",type:"text",required:!0,order:6},{id:"date",name:"date",label:"Agreement Date",type:"date",required:!0,order:7}],template:`
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Partnership Agreement</title>
<style>
body { font-family: 'Times New Roman', serif; margin: 40px; line-height: 1.6; color: #333; }
.title { text-align: center; font-size: 24px; margin-bottom: 30px; }
.section { margin-bottom: 20px; }
.signature { margin-top: 50px; display: flex; justify-content: space-between; }
</style>
</head>
<body>
<div class="title">Partnership Agreement</div>
<div class="section">
<p>This Partnership Agreement (the "Agreement") is made and entered into as of {{date}} by and between:</p>
<p><strong>{{partner1}}</strong>, residing at [address] ("Partner 1")</p>
<p>and</p>
<p><strong>{{partner2}}</strong>, residing at [address] ("Partner 2")</p>
<p>collectively referred to as the "Partners" for the purpose of carrying on the business of {{businessName}}.</p>
</div>
<div class="section">
<h3>1. Formation</h3>
<p>The Partners hereby form a partnership under the Partnership Act, 1932, for the purpose of [business purpose].</p>
</div>
<div class="section">
<h3>2. Contributions</h3>
<p>{{partner1}} shall contribute: {{contribution1}}</p>
<p>{{partner2}} shall contribute: {{contribution2}}</p>
</div>
<div class="section">
<h3>3. Profit and Loss Sharing</h3>
<p>Profits and losses shall be shared in the ratio of {{profitSharing}}.</p>
</div>
<div class="section">
<h3>4. Management</h3>
<p>All decisions shall be made jointly by both Partners. Major decisions require unanimous consent.</p>
</div>
<div class="section">
<h3>5. Term</h3>
<p>This partnership shall commence on {{date}} and continue until dissolved by mutual agreement or as per law.</p>
</div>
<div class="section">
<h3>6. Dissolution</h3>
<p>The partnership may be dissolved upon the death, bankruptcy, or withdrawal of a Partner, subject to applicable laws.</p>
</div>
<div class="section">
<h3>7. Governing Law</h3>
<p>This Agreement shall be governed by the laws of India.</p>
</div>
<div class="signature">
<div>
<p>{{partner1}}</p>
<p>___________________________</p>
<p>Date: {{date}}</p>
</div>
<div>
<p>{{partner2}}</p>
<p>___________________________</p>
<p>Date: {{date}}</p>
</div>
</div>
</body>
</html>
`},{id:"meeting-minutes",name:"Meeting Minutes",fields:[{id:"meetingTitle",name:"meetingTitle",label:"Meeting Title",type:"text",required:!0,order:1},{id:"date",name:"date",label:"Date",type:"date",required:!0,order:2},{id:"time",name:"time",label:"Time",type:"text",required:!0,order:3},{id:"location",name:"location",label:"Location",type:"text",required:!0,order:4},{id:"attendees",name:"attendees",label:"Attendees",type:"textarea",required:!0,order:5},{id:"agenda",name:"agenda",label:"Agenda",type:"textarea",required:!0,order:6},{id:"discussions",name:"discussions",label:"Discussions",type:"textarea",required:!0,order:7},{id:"decisions",name:"decisions",label:"Decisions",type:"textarea",required:!0,order:8},{id:"nextSteps",name:"nextSteps",label:"Next Steps",type:"textarea",required:!0,order:9}],template:`
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Meeting Minutes</title>
<style>
body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; color: #333; }
.header { text-align: center; margin-bottom: 30px; }
.section { margin-bottom: 20px; }
.section h3 { color: #555; }
.signature { margin-top: 50px; }
</style>
</head>
<body>
<div class="header">
<h1>Meeting Minutes</h1>
<h2>{{meetingTitle}}</h2>
</div>
<div class="section">
<p><strong>Date:</strong> {{date}}</p>
<p><strong>Time:</strong> {{time}}</p>
<p><strong>Location:</strong> {{location}}</p>
<p><strong>Facilitator:</strong> [Name]</p>
<p><strong>Note Taker:</strong> [Name]</p>
</div>
<div class="section">
<h3>Attendees</h3>
<p>{{attendees}}</p>
</div>
<div class="section">
<h3>Agenda</h3>
<p>{{agenda}}</p>
</div>
<div class="section">
<h3>Discussions</h3>
<p>{{discussions}}</p>
</div>
<div class="section">
<h3>Decisions</h3>
<p>{{decisions}}</p>
</div>
<div class="section">
<h3>Action Items</h3>
<p>{{nextSteps}}</p>
</div>
<div class="section">
<h3>Next Meeting</h3>
<p>Date: [Next Date] | Time: [Time] | Location: [Location]</p>
</div>
<div class="signature">
<p>Minutes prepared by: ___________________________ Date: {{date}}</p>
<p>Approved by: ___________________________ Date: ________</p>
</div>
</body>
</html>
`}];async function c(){try{let e=d().join(process.cwd(),"data","custom","templates.json"),t=[];try{let a=await p.promises.readFile(e,"utf8");t=JSON.parse(a)}catch(e){}let a=[...m.map(e=>({...e,isCustom:!1,category:({"appointment-letter":"HR","offer-letter":"HR","termination-letter":"HR","resignation-letter":"HR","performance-appraisal":"HR",nda:"Legal","employment-contract":"Legal","loan-agreement":"Legal","service-agreement":"Legal","partnership-agreement":"Legal",invoice:"Finance",quotation:"Finance",receipt:"Finance","payment-reminder":"Finance","meeting-minutes":"General",memo:"General",announcement:"General"})[e.id]||"General",createdAt:"2024-01-01T00:00:00Z",updatedAt:"2024-01-01T00:00:00Z",version:1})),...t];return s.NextResponse.json(a)}catch(e){return console.error("Error fetching templates:",e),s.NextResponse.json({error:"Failed to fetch templates"},{status:500})}}let h=new r.AppRouteRouteModule({definition:{kind:n.x.APP_ROUTE,page:"/api/templates/route",pathname:"/api/templates",filename:"route",bundlePath:"app/api/templates/route"},resolvedPagePath:"/Users/kushagra/Desktop/DocGenerator/app/api/templates/route.ts",nextConfigOutput:"",userland:i}),{requestAsyncStorage:y,staticGenerationAsyncStorage:g,serverHooks:u}=h,_="/api/templates/route";function b(){return(0,o.patchFetch)({serverHooks:u,staticGenerationAsyncStorage:g})}}};var t=require("../../../webpack-runtime.js");t.C(e);var a=e=>t(t.s=e),i=t.X(0,[948,972],()=>a(6469));module.exports=i})();