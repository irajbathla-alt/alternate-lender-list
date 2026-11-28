window.downloadVFCApplication=function(r){if(!window.jspdf)throw Error('PDF engine unavailable');const doc=new jspdf.jsPDF({unit:'pt',format:'letter'}),data={...r,legalName:r.business,ownerName:r.name};const displayMoney=v=>v?'$'+Math.round(Number(v)).toLocaleString('en-CA'):'';const displayDate=v=>v||'';function wrapPdfText(doc,text,x,y,maxWidth,lineHeight){const lines=doc.splitTextToSize(String(text||''),maxWidth);doc.text(lines,x,y);return y+lines.length*lineHeight;}     const left=54,right=558,width=right-left;
    doc.setTextColor(23,19,15);
    doc.setFont('times','normal');
    doc.setFontSize(20);
    doc.text('Vancouver Finance Company Inc.',306,42,{align:'center'});
    doc.setFontSize(12);
    doc.text('Small Business Financing',306,60,{align:'center'});
    doc.setDrawColor(41,41,41);
    

    doc.setFont('times','normal');doc.setFontSize(23);
    doc.text('Broker Partner Information:',left,100);
    let by=122;doc.setFontSize(9.4);
    for(const [k,v] of [['Broker Name',r.brokerName],['Broker ID',r.brokerId],['Broker Email',r.brokerEmail],['Broker Phone',r.brokerPhone]]){doc.setFont('helvetica','bold');doc.text(k+':',left,by);doc.setFont('helvetica','normal');by=wrapPdfText(doc,v||'Not provided',320,by,230,11)+6;}
    doc.setFont('times','normal');doc.setFontSize(23);doc.text('Business Information:',left,by+18);
    doc.setFont('helvetica','normal');doc.setFontSize(9);
    let y=by+40;
    const appRows=[
      ['Legal Business Name',data.legalName],
      ['Nature of Business',data.nature],
      ['No. of Employees',data.employees],
      ['Annual Revenue (Last 12 Months)',displayMoney(data.revenue)],
      ['Business Address',data.businessAddress],
      ['Business Registration Year',data.registrationYear],
      ['Business Bank Account',data.bank]
    ];
    for(const [label,val] of appRows){
      doc.setFont('helvetica','bold');doc.text(label+':',left,y);
      doc.setFont('helvetica','normal');
      y=wrapPdfText(doc,val||'Not provided',320,y,230,11)+6;
    }

    y+=18;doc.setFont('times','normal');doc.setFontSize(23);doc.text('Business Owner Information:',left,y);y+=24;doc.setFontSize(9.4);
    const ownerRows=[
      ['First Name & Last Name',data.ownerName],
      ['Date of Birth',displayDate(data.dob)],
      ['Phone Number',data.phone],
      ['Email Address',data.email],
      ['Address',data.ownerAddress]
    ];
    for(const [label,val] of ownerRows){
      doc.setFont('helvetica','bold');doc.text(label+':',left,y);
      doc.setFont('helvetica','normal');
      y=wrapPdfText(doc,val||'Not provided',320,y,230,11)+6;
    }

    doc.addPage();doc.setFont('times','normal');doc.setFontSize(20);doc.text('Vancouver Finance Company Inc.',306,42,{align:'center'});doc.setFontSize(12);doc.text('Small Business Financing',306,60,{align:'center'});y=108;
    y+=7;doc.setFont('helvetica','bold');doc.text('CREDIT CHECK & CONSENT AUTHORIZATION',left,y);y+=18;
    doc.setFont('helvetica','normal');doc.setFontSize(8);
    const consent='Each person signing below declares that all information provided in this Business Financing Application is true, accurate, and complete. I/We authorize Vancouver Finance Company Inc., its affiliated companies, partner lenders, funding providers, Authorized Agents, and designated representatives — including, but not limited to, DUCA Financial Credit Union, Merchant Growth, Sheaves Capital, KM Capital, Canacap Funding, Journey Capital, Driven, iCapital, Vancity, and Xuper Funding — to obtain, verify, exchange, and disclose personal, business, financial, banking, and credit information as reasonably required to assess, arrange, obtain, or service financing or other financial products on my/our behalf. I/We authorize Vancouver Finance Company Inc. and its designated representatives to obtain credit bureau reports and, where reasonably required in connection with my/our financing request, additional credit reports or credit-monitoring information for up to 12 months from the date of this consent. I/We also consent to being contacted by Vancouver Finance Company Inc. by email, telephone, text message, or other electronic means regarding my/our application, financing opportunities, products, services, renewals, updates, and related financial information. Marketing consent may be withdrawn at any time, subject to communications otherwise permitted or required by law. I/We agree that an electronic or photocopied version of this consent shall have the same validity as the original. I/We consent to the collection, use, and disclosure of my/our personal and business information in accordance with Vancouver Finance Company Inc.’s Privacy & Consent Policy, available at: https://www.vancouverfinancecompany.com/privacy-and-consent.html';
    const lines=doc.splitTextToSize(consent,472);doc.text(consent,70,y,{align:'justify',maxWidth:472,lineHeightFactor:1.22});y+=lines.length*10+10;

    if(y>625){doc.addPage();y=70}
    doc.setFont('helvetica','bold');doc.setFontSize(9);doc.text('Electronic Signature',left,y);y+=9;
    doc.setDrawColor(180,170,160);doc.rect(left,y,250,72);
    doc.text('UNSIGNED DEMO - awaiting client signature',left+8,y+30);
    y+=88;
    doc.setFont('helvetica','normal');
    doc.text('Signatory: '+(data.ownerName||''),left,y);
    doc.text('Date: '+'Pending signature',left+280,y);

 doc.setFontSize(8);doc.text('Application ID: '+r.id+' | UNSIGNED DEMONSTRATION',54,760);doc.save(r.id+'-Unsigned-Application.pdf');};