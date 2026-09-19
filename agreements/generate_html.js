const fs = require('fs');
const path = require('path');

const logoBase64 = fs.readFileSync(path.join(__dirname, 'logo_base64.txt'), 'utf8').trim();

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title></title>
  <style>
    :root {
      --primary: #0F52BA;
      --primary-dark: #081F3E;
      --secondary: #00A3FF;
      --accent: #EBF3FA;
      --text-main: #1C2735;
      --text-muted: #4B5563;
      --border-color: #D1D5DB;
      --border-light: #E5E7EB;
      --callout-bg: #F9FAFB;
      --success: #059669;
      --warning-border: #D97706;
      --warning-bg: #FFFBEB;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: var(--text-main);
      background-color: #F3F4F6;
      line-height: 1.6;
      font-size: 13.5px;
      -webkit-font-smoothing: antialiased;
    }

    /* Screen Toolbar */
    .toolbar {
      position: sticky;
      top: 0;
      z-index: 1000;
      background: #FFFFFF;
      border-bottom: 1px solid var(--border-color);
      padding: 12px 30px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    }

    .toolbar-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .toolbar-title {
      font-weight: 700;
      font-size: 14px;
      color: var(--primary-dark);
    }

    .badge {
      display: inline-block;
      padding: 3px 9px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .badge-primary {
      background: #E0E7FF;
      color: #3730A3;
    }

    .badge-success {
      background: #D1FAE5;
      color: #065F46;
    }

    .btn-print {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: var(--primary);
      color: #FFFFFF;
      border: none;
      padding: 9px 18px;
      border-radius: 6px;
      font-weight: 600;
      font-size: 13px;
      cursor: pointer;
      transition: background 0.2s ease, transform 0.1s ease;
      box-shadow: 0 2px 4px rgba(15, 82, 186, 0.25);
    }

    .btn-print:hover {
      background: #0B3C8A;
      transform: translateY(-1px);
    }

    /* Document Sheet Container */
    .document-container {
      max-width: 860px;
      margin: 32px auto;
      background: #FFFFFF;
      box-shadow: 0 4px 25px rgba(0, 0, 0, 0.08);
      border-radius: 8px;
      padding: 48px 56px;
      border: 1px solid #E5E7EB;
    }

    /* Header */
    .doc-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 22px;
      border-bottom: 2.5px solid var(--primary);
      margin-bottom: 26px;
    }

    .logo-box img {
      height: 46px;
      width: auto;
      display: block;
    }

    .doc-meta {
      text-align: right;
    }

    .doc-meta .ref-number {
      font-size: 11px;
      font-weight: 700;
      color: var(--primary);
      letter-spacing: 0.5px;
      margin-bottom: 2px;
    }

    .doc-meta .tagline {
      font-size: 10px;
      color: var(--text-muted);
      letter-spacing: 1px;
      text-transform: uppercase;
      font-weight: 600;
    }

    /* Title Block */
    .doc-title-block {
      text-align: center;
      margin-bottom: 28px;
      padding: 16px 20px;
      background: linear-gradient(180deg, #F8FAFC 0%, #EFF6FF 100%);
      border-radius: 6px;
      border: 1px solid #DBEAFE;
    }

    .doc-title {
      font-size: 19px;
      font-weight: 800;
      color: var(--primary-dark);
      letter-spacing: 0.5px;
      text-transform: uppercase;
      margin-bottom: 4px;
    }

    .doc-subtitle {
      font-size: 13.5px;
      font-weight: 600;
      color: var(--primary);
    }

    /* Parties Section */
    .parties-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 24px;
    }

    .party-card {
      background: var(--callout-bg);
      border: 1px solid var(--border-color);
      border-radius: 6px;
      padding: 16px 18px;
    }

    .party-title {
      font-size: 11.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: var(--primary);
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 6px;
      margin-bottom: 10px;
    }

    .party-name {
      font-size: 14px;
      font-weight: 700;
      color: var(--primary-dark);
      margin-bottom: 8px;
    }

    .field-row {
      margin-bottom: 6px;
      font-size: 12.5px;
      display: flex;
    }

    .field-label {
      width: 95px;
      color: var(--text-muted);
      font-weight: 500;
      flex-shrink: 0;
    }

    .field-value {
      font-weight: 500;
      flex-grow: 1;
    }

    .field-fillable {
      border-bottom: 1px dotted #6B7280;
      display: inline-block;
      width: 100%;
      min-height: 18px;
    }

    /* Section Styles */
    .section {
      margin-bottom: 22px;
    }

    .section-title {
      font-size: 14px;
      font-weight: 700;
      color: var(--primary-dark);
      text-transform: uppercase;
      letter-spacing: 0.4px;
      margin-bottom: 10px;
      padding-bottom: 4px;
      border-bottom: 1px solid var(--border-light);
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .section-number {
      background: var(--primary);
      color: #FFFFFF;
      font-size: 11px;
      width: 20px;
      height: 20px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      font-weight: 700;
    }

    p {
      margin-bottom: 8px;
      text-align: justify;
    }

    ul {
      margin-left: 22px;
      margin-bottom: 10px;
    }

    li {
      margin-bottom: 5px;
      padding-left: 3px;
    }

    /* Table Styles */
    .pricing-table {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0 16px 0;
      font-size: 12.5px;
      border-radius: 6px;
      overflow: hidden;
      border: 1px solid var(--border-color);
    }

    .pricing-table th {
      background: var(--primary-dark);
      color: #FFFFFF;
      font-weight: 600;
      padding: 9px 12px;
      text-align: left;
      font-size: 11.5px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .pricing-table td {
      padding: 9px 12px;
      border-bottom: 1px solid var(--border-color);
    }

    .pricing-table tr:nth-child(even) td {
      background: #F9FAFB;
    }

    .pricing-table tr.highlight-row td {
      background: #EFF6FF;
      font-weight: 700;
      color: var(--primary-dark);
      border-top: 2px solid var(--primary);
      border-bottom: 2px solid var(--primary);
    }

    .text-right {
      text-align: right;
    }

    .text-center {
      text-align: center;
    }

    /* Confirmation Callout Box */
    .callout-box {
      background: var(--warning-bg);
      border-left: 4px solid var(--warning-border);
      border-radius: 4px;
      padding: 12px 16px;
      margin: 14px 0 18px 0;
      font-size: 12.5px;
      color: #78350F;
    }

    .callout-box.info {
      background: #EFF6FF;
      border-left: 4px solid var(--primary);
      color: #1E3A8A;
    }

    .callout-header {
      font-weight: 700;
      font-size: 13px;
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 6px;
    }

    .checkbox-row {
      display: flex;
      gap: 20px;
      margin-top: 8px;
      font-weight: 600;
    }

    .checkbox-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .checkbox-box {
      width: 14px;
      height: 14px;
      border: 1.5px solid #92400E;
      display: inline-block;
      border-radius: 2px;
      background: #FFFFFF;
    }

    /* Signatures */
    .signatures-block {
      margin-top: 30px;
      page-break-inside: avoid;
    }

    .signatures-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-top: 14px;
    }

    .sig-card {
      border: 1px solid var(--border-color);
      border-radius: 6px;
      padding: 16px;
      background: #FFFFFF;
    }

    .sig-party-title {
      font-size: 11.5px;
      font-weight: 700;
      color: var(--primary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid var(--border-light);
      padding-bottom: 5px;
      margin-bottom: 12px;
    }

    .sig-line {
      border-bottom: 1px solid #9CA3AF;
      height: 42px;
      margin-bottom: 12px;
      position: relative;
    }

    .sig-line-label {
      position: absolute;
      bottom: -18px;
      left: 0;
      font-size: 10px;
      color: #6B7280;
      text-transform: uppercase;
      font-weight: 600;
    }

    .sig-details {
      margin-top: 22px;
    }

    .sig-field {
      display: flex;
      margin-bottom: 7px;
      font-size: 12px;
    }

    .sig-field-name {
      width: 85px;
      color: var(--text-muted);
      font-weight: 500;
    }

    .sig-field-value {
      flex: 1;
      border-bottom: 1px dotted #CBD5E1;
      min-height: 16px;
      font-weight: 500;
    }

    .witness-section {
      margin-top: 22px;
      border-top: 1px dashed var(--border-color);
      padding-top: 14px;
      font-size: 12px;
    }

    .witness-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-top: 10px;
    }

    /* Footer */
    .doc-footer {
      margin-top: 32px;
      padding-top: 12px;
      border-top: 1px solid var(--border-color);
      text-align: center;
      font-size: 11px;
      color: var(--text-muted);
    }

    /* Print Styles */
    @media print {
      body {
        background: #FFFFFF;
        font-size: 11pt;
        line-height: 1.45;
        color: #000000;
      }

      .toolbar {
        display: none !important;
      }

      .document-container {
        max-width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        border: none !important;
        box-shadow: none !important;
        border-radius: 0 !important;
      }

      .doc-header {
        border-bottom: 2pt solid #0F52BA;
        padding-bottom: 12pt;
        margin-bottom: 14pt;
      }

      .party-card, .sig-card, .pricing-table {
        border-color: #888888 !important;
      }

      .callout-box {
        border-left: 4pt solid #333333 !important;
        background: #F4F4F4 !important;
        color: #000000 !important;
      }

      .pricing-table th {
        background: #081F3E !important;
        color: #FFFFFF !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .pricing-table tr.highlight-row td {
        background: #EEF2F6 !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .section-number {
        background: #0F52BA !important;
        color: #FFFFFF !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .page-break {
        page-break-before: always;
      }

      @page {
        size: A4 portrait;
        margin: 16mm 15mm 16mm 15mm;
      }
    }
  </style>
</head>
<body>

  <!-- Screen Toolbar -->
  <div class="toolbar">
    <div class="toolbar-info">
      <span class="toolbar-title">MeskOra Technologies (PVT) Ltd. — Client Agreement</span>
      <span class="badge badge-primary">Standard Agreement</span>
      <span class="badge badge-success">Sri Lankan Law</span>
    </div>
    <button class="btn-print" onclick="window.print()">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="6 9 6 2 18 2 18 9"></polyline>
        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
        <rect x="6" y="14" width="12" height="8"></rect>
      </svg>
      Print / Save as PDF
    </button>
  </div>

  <div class="document-container">
    <!-- Header with Embedded Logo -->
    <header class="doc-header">
      <div class="logo-box">
        <img src="data:image/png;base64,${logoBase64}" alt="MeskOra Technologies (PVT) Ltd." />
      </div>
      <div class="doc-meta">
        <div class="ref-number">REF: MESKORA-AGR-2026-BMS</div>
        <div class="tagline">INNOVATING • SOLVING • TRANSFORMING</div>
      </div>
    </header>

    <!-- Document Title Block -->
    <div class="doc-title-block">
      <h1 class="doc-title">Web System Development, Delivery and Maintenance Agreement</h1>
      <div class="doc-subtitle">Project: Building Materials Suppliers Web System</div>
    </div>

    <!-- Agreement Preamble & Parties Grid -->
    <p style="margin-bottom: 14px;">
      This <strong>Web System Development, Delivery and Maintenance Agreement</strong> (hereinafter referred to as the <strong>"Agreement"</strong>) is made and entered into on this <span class="field-fillable" style="width: 40px; display:inline-block;"></span> day of <span class="field-fillable" style="width: 110px; display:inline-block;"></span>, 2026 (the <strong>"Agreement Date"</strong>), by and between:
    </p>

    <div class="parties-grid">
      <!-- Service Provider -->
      <div class="party-card">
        <div class="party-title">The Service Provider</div>
        <div class="party-name">MeskOra Technologies (PVT) Ltd.</div>
        <div class="field-row">
          <span class="field-label">Company Reg:</span>
          <span class="field-value">PV [________________________]</span>
        </div>
        <div class="field-row">
          <span class="field-label">Registered Office:</span>
          <span class="field-value">[Colombo / Sri Lanka Address]</span>
        </div>
        <div class="field-row">
          <span class="field-label">Official Email:</span>
          <span class="field-value">contact@meskora.com</span>
        </div>
        <div class="field-row">
          <span class="field-label">Authorized Rep:</span>
          <span class="field-value">[Authorized Officer Name]</span>
        </div>
        <p style="margin-top: 8px; font-size: 11px; color: var(--text-muted);">
          (hereinafter referred to as the <strong>"Service Provider"</strong> or <strong>"MeskOra"</strong>, which expression shall include its legal successors and permitted assigns).
        </p>
      </div>

      <!-- Client -->
      <div class="party-card">
        <div class="party-title">The Client</div>
        <div class="party-name">[Client / Company Name]</div>
        <div class="field-row">
          <span class="field-label">Company / Client:</span>
          <span class="field-value field-fillable"></span>
        </div>
        <div class="field-row">
          <span class="field-label">Business Reg / ID:</span>
          <span class="field-value field-fillable"></span>
        </div>
        <div class="field-row">
          <span class="field-label">Address:</span>
          <span class="field-value field-fillable"></span>
        </div>
        <div class="field-row">
          <span class="field-label">Contact Person:</span>
          <span class="field-value field-fillable"></span>
        </div>
        <div class="field-row">
          <span class="field-label">Email & Phone:</span>
          <span class="field-value field-fillable"></span>
        </div>
        <p style="margin-top: 8px; font-size: 11px; color: var(--text-muted);">
          (hereinafter referred to as the <strong>"Client"</strong>, which expression shall include its legal successors and permitted assigns).
        </p>
      </div>
    </div>

    <!-- Preamble Recitals -->
    <div style="background: var(--callout-bg); padding: 10px 14px; border-radius: 6px; border: 1px solid var(--border-color); margin-bottom: 22px; font-size: 12px;">
      <strong>WHEREAS</strong> the Client wishes to engage the Service Provider to deliver, host, and maintain a <strong>Building Materials Suppliers Web System</strong> for its commercial operations;<br />
      <strong>AND WHEREAS</strong> MeskOra Technologies (PVT) Ltd. agrees to provide such web system development, deployment, hosting management, and continuous maintenance services subject to the mutual terms and conditions set forth below;
    </div>

    <!-- Section 1: Agreement Details -->
    <div class="section">
      <h2 class="section-title"><span class="section-number">1</span> Agreement Details & Commencement</h2>
      <p>
        <strong>1.1 Project Title:</strong> Building Materials Suppliers Web System.<br />
        <strong>1.2 Commencement Date:</strong> The project and service period shall commence in <strong>September 2026</strong>.<br />
        <strong>1.3 Purpose:</strong> MeskOra Technologies (PVT) Ltd. agrees to configure, deploy, host, and maintain the web system to facilitate the Client's building materials supply operations, catalog presentations, customer inquiries, and supplier interactions.
      </p>
    </div>

    <!-- Section 2: Financial Terms -->
    <div class="section">
      <h2 class="section-title"><span class="section-number">2</span> Financial Terms & Commercial Schedule</h2>
      <p>
        The parties agree to the following exact commercial and financial terms:
      </p>

      <table class="pricing-table">
        <thead>
          <tr>
            <th style="width: 46%;">Service / Fee Item</th>
            <th style="width: 24%;">Applicable Duration</th>
            <th style="width: 30%;" class="text-right">Amount (LKR)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Initial Web System Development Charges</strong><br /><span style="font-size: 11px; color: var(--text-muted);">System setup, core development, module configuration & deployment</span></td>
            <td>One-time (Commencement)</td>
            <td class="text-right" style="color: var(--success); font-weight: 700;">FREE / LKR 0.00</td>
          </tr>
          <tr>
            <td><strong>Monthly Service & Maintenance Charge</strong><br /><span style="font-size: 11px; color: var(--text-muted);">Routine maintenance, backups, change requests, technical support & monitoring</span></td>
            <td>Per calendar month</td>
            <td class="text-right">LKR 20,000.00 / month</td>
          </tr>
          <tr>
            <td><strong>Cloud Web Server Hosting (Initial Setup Month)</strong><br /><span style="font-size: 11px; color: var(--text-muted);">First month cloud virtual server hosting and configuration fee</span></td>
            <td>First Month (September 2026)</td>
            <td class="text-right">LKR 4,700.00</td>
          </tr>
          <tr>
            <td><strong>Domain Name Registration & Annual Management</strong><br /><span style="font-size: 11px; color: var(--text-muted);">1-year official domain registration and DNS record management</span></td>
            <td>September 2026 to September 2027</td>
            <td class="text-right">LKR 2,300.00</td>
          </tr>
          <tr class="highlight-row">
            <td><strong>Total Monthly Service Charges for Six (6) Months</strong><br /><span style="font-size: 11px; color: var(--text-muted);">Full agreed initial maintenance period (September 2026 – February 2027)</span></td>
            <td>6 Calendar Months</td>
            <td class="text-right">LKR 120,000.00</td>
          </tr>
        </tbody>
      </table>

      <!-- Verification Callout Box -->
      <div class="callout-box">
        <div class="callout-header">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          Important Note: Verification and Confirmation of Service Period Duration
        </div>
        <p style="margin-bottom: 5px;">
          The monthly service fee is agreed at <strong>LKR 20,000 per month</strong>. The parties should check and confirm the exact intended service duration prior to signing:
        </p>
        <ul style="margin-left: 18px; margin-bottom: 8px;">
          <li><strong>Option 1 (Six Full Calendar Months):</strong> From September 2026 through February 2027 (September, October, November, December 2026, January, and February 2027). This constitutes <strong>exactly six (6) calendar months</strong>, with total service charges of <strong>LKR 120,000.00</strong>.</li>
          <li><strong>Option 2 (Five Calendar Months):</strong> From September 2026 through January 2027 (September, October, November, December 2026, and January 2027). This constitutes <strong>five (5) calendar months</strong>, with total service charges of <strong>LKR 100,000.00</strong>.</li>
        </ul>
        <div class="checkbox-row">
          <span class="checkbox-item"><span class="checkbox-box"></span> <strong>Confirmed: 6-Month Period</strong> (Sep 2026 – Feb 2027 = LKR 120,000)</span>
          <span class="checkbox-item"><span class="checkbox-box"></span> <strong>Confirmed: 5-Month Period</strong> (Sep 2026 – Jan 2027 = LKR 100,000)</span>
        </div>
      </div>

      <p>
        <strong>2.1 Payment Schedule:</strong> The monthly service charge of LKR 20,000 shall be invoiced at the beginning of each service month and settled by the Client within seven (7) business days of the invoice date. The initial server setup fee (LKR 4,700) and domain fee (LKR 2,300) are due upon execution of this Agreement.
      </p>
      <p>
        <strong>2.2 Subsequent Server Hosting Costs:</strong> After the first month (September 2026), web server hosting costs will be billed to the Client at the actual, verified cost charged by the third-party cloud infrastructure provider or reimbursed to MeskOra upon monthly invoice.
      </p>
    </div>

    <!-- Section 3: Service Provider Responsibilities -->
    <div class="section">
      <h2 class="section-title"><span class="section-number">3</span> Service Provider Responsibilities</h2>
      <p>
        Within the agreed monthly service charge, MeskOra Technologies (PVT) Ltd. shall be responsible for:
      </p>
      <ul>
        <li><strong>Web Infrastructure & System Availability:</strong> Maintaining the underlying web hosting environment and ensuring reasonable, continuous availability and reliable performance of the web system.</li>
        <li><strong>Routine Maintenance & Technical Support:</strong> Performing routine software health checks, applying security updates, carrying out bug fixes, and providing technical support during standard business hours.</li>
        <li><strong>Change Requests (CRs) & Feature Developments:</strong> Handling agreed minor change requests (CRs), functional enhancements, visual refinements, and configuration adjustments within reasonable monthly technical capacity.</li>
        <li><strong>Disaster Recovery Activities:</strong> Maintaining disaster recovery protocols and executing restoration activities when required to recover system operations after any data or system event.</li>
        <li><strong>System & Database Backups:</strong> Maintaining regular, automated database and file backups to safeguard against data loss.</li>
        <li><strong>System Monitoring & Issue Resolution:</strong> Proactively monitoring system availability and resolving reported technical errors within reasonable and prompt timeframes.</li>
        <li><strong>Deployed Application Maintenance:</strong> Maintaining the live deployed web application, SSL certificates, web server configurations, and required software dependencies.</li>
      </ul>
      <p style="font-size: 12px; color: var(--text-muted); background: var(--callout-bg); padding: 7px 12px; border-radius: 4px; border: 1px solid var(--border-color);">
        <em><strong>Reasonable Operational Limits:</strong> MeskOra shall exercise professional diligence to maintain high availability. However, MeskOra does not guarantee 100% uninterrupted uptime or zero external failure, nor does the flat monthly service fee cover unlimited development work or major system overhauls.</em>
      </p>
    </div>

    <!-- Section 4: Client Responsibilities -->
    <div class="section">
      <h2 class="section-title"><span class="section-number">4</span> Client Responsibilities</h2>
      <p>
        The Client agrees to fulfill the following essential responsibilities:
      </p>
      <ul>
        <li><strong>Accurate Requirements & Content:</strong> Provide accurate business specifications, product data, material catalogs, pricing information, logos, and digital content necessary for system configuration and operation.</li>
        <li><strong>Timely Feedback & Approvals:</strong> Provide timely feedback, testing sign-offs, and necessary approvals within five (5) business days to prevent operational delays.</li>
        <li><strong>Payment of Fees & Infrastructure Expenses:</strong> Pay the monthly service charges (LKR 20,000/month) and actual infrastructure expenses (server hosting and domain renewals) in a prompt and timely manner.</li>
        <li><strong>Responsible System Use & Credential Security:</strong> Use the web system responsibly and strictly in accordance with applicable laws, safeguard administrative access credentials, and prevent unauthorized user access.</li>
        <li><strong>Prompt Issue Notification:</strong> Promptly notify MeskOra Technologies (PVT) Ltd. of any technical errors, defects, or security concerns encountered during operation.</li>
      </ul>
    </div>

    <!-- Section 5: Project Delivery -->
    <div class="section">
      <h2 class="section-title"><span class="section-number">5</span> Project Delivery & Scope Management</h2>
      <p>
        <strong>5.1 System Delivery & Access:</strong> MeskOra Technologies (PVT) Ltd. shall deliver the agreed Building Materials Suppliers web system and grant operational access credentials to the Client after completing the initial setup, deployment, and testing activities.
      </p>
      <p>
        <strong>5.2 Out-of-Scope Modules & Features:</strong> New modules, third-party integrations, or major features outside the agreed initial scope of the Building Materials Suppliers web system shall require mutual written approval, including an agreed delivery schedule and additional development charges prior to implementation.
      </p>
    </div>

    <!-- Section 6: Ownership and Access -->
    <div class="section">
      <h2 class="section-title"><span class="section-number">6</span> Ownership and Access Rights</h2>
      <p>
        <strong>6.1 Right of Use:</strong> The Client receives a non-exclusive commercial right and license to use the delivered web system for its business operations for the duration of this Agreement and any subsequent renewal periods.
      </p>
      <p>
        <strong>6.2 Service Provider Intellectual Property:</strong> MeskOra Technologies (PVT) Ltd. retains full proprietary ownership of its existing reusable software components, core frameworks, code libraries, utilities, algorithms, and development tools utilized in delivering the system.
      </p>
      <p>
        <strong>6.3 Source Code Ownership:</strong> Any transfer or assignment of full source-code ownership to the Client must be separately agreed upon in writing under mutually agreed commercial terms.
      </p>
      <p>
        <strong>6.4 User Credentials:</strong> The Client will receive the administrative access rights, user logins, and credentials necessary to manage products, materials, inquiries, and routine system features.
      </p>
    </div>

    <!-- Section 7: Hosting, Domain and Backups -->
    <div class="section">
      <h2 class="section-title"><span class="section-number">7</span> Hosting, Domain and Infrastructure Management</h2>
      <p>
        <strong>7.1 Web Server Hosting:</strong> MeskOra shall provision and manage the cloud server environment hosting the web system. First month hosting (September 2026) is fixed at LKR 4,700. Subsequent hosting fees will be billed at actual third-party rates.
      </p>
      <p>
        <strong>7.2 Domain Registration & Renewal:</strong> The domain name shall be registered and managed by MeskOra on behalf of the Client for one year (September 2026 to September 2027) for LKR 2,300. Subsequent annual renewals shall be invoiced to the Client prior to expiration.
      </p>
      <p>
        <strong>7.3 Third-Party Outage Disclaimer:</strong> Server hosting and domain services rely on external cloud providers. MeskOra shall not be legally liable for temporary disruptions, network transit failures, or outages caused solely by third-party hosting companies, registrars, or global network failures, but shall use all reasonable efforts to resolve such issues.
      </p>
      <p>
        <strong>7.4 Cost Reimbursement:</strong> Actual server and domain costs are payable directly by the Client or reimbursed to MeskOra Technologies (PVT) Ltd. according to the agreed arrangement upon invoice.
      </p>
    </div>

    <!-- Section 8: Agreement Period and Termination -->
    <div class="section">
      <h2 class="section-title"><span class="section-number">8</span> Agreement Period and Termination</h2>
      <p>
        <strong>8.1 Service Period:</strong> This Agreement shall remain in effect for the agreed monthly service period of six (6) calendar months, from <strong>September 2026 to February 2027</strong> (or five (5) months if confirmed under Section 2).
      </p>
      <p>
        <strong>8.2 Renewal:</strong> Upon expiry of the initial service period, the parties may renew or continue the agreement on a monthly or annual basis upon mutual written agreement.
      </p>
      <p>
        <strong>8.3 Mutual Termination:</strong> Either party may terminate this Agreement at any time by mutual written agreement.
      </p>
      <p>
        <strong>8.4 Termination for Material Breach:</strong> Either party may terminate this Agreement if the other party commits a material breach of any term (including non-payment) and fails to remedy the breach within fourteen (14) calendar days of receiving written notice.
      </p>
      <p>
        <strong>8.5 Outstanding Payments:</strong> In the event of termination, the Client shall promptly pay all outstanding monthly service fees and approved infrastructure expenses incurred up to the date of termination.
      </p>
      <p>
        <strong>8.6 Handover Arrangement:</strong> Following termination and full payment of all dues, MeskOra shall provide an export of the Client's business data and assist in transferring domain administrative controls to the Client.
      </p>
    </div>

    <!-- Section 9: Confidentiality and Data -->
    <div class="section">
      <h2 class="section-title"><span class="section-number">9</span> Confidentiality and Data Ownership</h2>
      <p>
        <strong>9.1 Confidentiality:</strong> Both parties agree to protect and keep confidential all non-public business, commercial, and technical information disclosed during the project and shall not disclose such information to any third party without written consent.
      </p>
      <p>
        <strong>9.2 Client Data Ownership:</strong> The Client owns all its business data, customer records, supplier catalogs, transactions, and content handled through or stored within the web system.
      </p>
      <p>
        <strong>9.3 Data Security:</strong> MeskOra Technologies (PVT) Ltd. will use reasonable technical and operational measures to protect the business data handled through the system against unauthorized access, loss, or corruption.
      </p>
    </div>

    <!-- Section 10: Governing Law -->
    <div class="section">
      <h2 class="section-title"><span class="section-number">10</span> Governing Law and Dispute Resolution</h2>
      <p>
        <strong>10.1 Applicable Law:</strong> This Agreement shall be governed by and construed in accordance with the applicable laws of the <strong>Democratic Socialist Republic of Sri Lanka</strong>.
      </p>
      <p>
        <strong>10.2 Amicable Resolution:</strong> The parties agree that in the event of any disagreement, dispute, or claim arising out of this Agreement, they shall first attempt to resolve the matter amicably through good-faith negotiations before using available legal remedies.
      </p>
    </div>

    <!-- Section 11: General Notice & Advisory -->
    <div class="section">
      <h2 class="section-title"><span class="section-number">11</span> Final Provisions & Legal Advisory Note</h2>
      <p>
        <strong>11.1 Entire Agreement:</strong> This Agreement represents the full and complete understanding between the parties and replaces any prior discussions or oral commitments.
      </p>
      <p>
        <strong>11.2 Written Amendments:</strong> Any modification to this Agreement must be made in writing and signed by authorized representatives of both parties.
      </p>
      <div class="callout-box info" style="margin-top: 14px;">
        <div class="callout-header">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
          Advisory Note: Independent Legal Review
        </div>
        <p style="margin-bottom: 0;">
          <em>This document has been drafted using clear, practical commercial language suitable for business operations in Sri Lanka. It is recommended that this Agreement be reviewed by a qualified Sri Lankan legal professional before final execution.</em>
        </p>
      </div>
    </div>

    <!-- Section 12: Signatures -->
    <div class="signatures-block">
      <h2 class="section-title"><span class="section-number">12</span> Signatures and Execution</h2>
      <p>
        IN WITNESS WHEREOF, the parties hereto have signed this Agreement through their duly authorized representatives on the date first written above:
      </p>

      <div class="signatures-grid">
        <!-- Service Provider Sign -->
        <div class="sig-card">
          <div class="sig-party-title">For MeskOra Technologies (PVT) Ltd.:</div>
          <div style="font-weight: 700; margin-bottom: 8px;">MeskOra Technologies (PVT) Ltd.</div>
          <div class="sig-line">
            <span class="sig-line-label">Authorized Signature & Seal</span>
          </div>
          <div class="sig-details">
            <div class="sig-field">
              <span class="sig-field-name">Name:</span>
              <span class="sig-field-value">____________________________________</span>
            </div>
            <div class="sig-field">
              <span class="sig-field-name">Designation:</span>
              <span class="sig-field-value">Director / Authorized Representative</span>
            </div>
            <div class="sig-field">
              <span class="sig-field-name">Date:</span>
              <span class="sig-field-value">______ / ______ / 2026</span>
            </div>
          </div>
        </div>

        <!-- Client Sign -->
        <div class="sig-card">
          <div class="sig-party-title">For the Client:</div>
          <div style="font-weight: 700; margin-bottom: 8px;">[Client / Company Name]</div>
          <div class="sig-line">
            <span class="sig-line-label">Authorized Signature & Official Stamp</span>
          </div>
          <div class="sig-details">
            <div class="sig-field">
              <span class="sig-field-name">Name:</span>
              <span class="sig-field-value">____________________________________</span>
            </div>
            <div class="sig-field">
              <span class="sig-field-name">Company:</span>
              <span class="sig-field-value">____________________________________</span>
            </div>
            <div class="sig-field">
              <span class="sig-field-name">Designation:</span>
              <span class="sig-field-value">____________________________________</span>
            </div>
            <div class="sig-field">
              <span class="sig-field-name">Date:</span>
              <span class="sig-field-value">______ / ______ / 2026</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Witnesses Block -->
      <div class="witness-section">
        <strong>Witnesses (Attestation):</strong>
        <div class="witness-grid">
          <div>
            <strong>Witness 1 (For MeskOra):</strong>
            <div style="margin-top: 6px;">Signature: _______________________________</div>
            <div style="margin-top: 4px;">Name: ___________________________________</div>
            <div style="margin-top: 4px;">NIC / ID No: ____________________________</div>
          </div>
          <div>
            <strong>Witness 2 (For Client):</strong>
            <div style="margin-top: 6px;">Signature: _______________________________</div>
            <div style="margin-top: 4px;">Name: ___________________________________</div>
            <div style="margin-top: 4px;">NIC / ID No: ____________________________</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Document Footer -->
    <footer class="doc-footer">
      <div>MeskOra Technologies (PVT) Ltd. | Commercial Agreement | Ref: MESKORA-AGR-2026-BMS</div>
      <div>Page 1 of 1 • Building Materials Suppliers Web System</div>
    </footer>
  </div>

</body>
</html>
`;

fs.writeFileSync(path.join(__dirname, 'MeskOra_Agreement_Building_Materials_System.html'), html, 'utf8');
console.log('Successfully generated standalone HTML agreement at agreements/MeskOra_Agreement_Building_Materials_System.html');
