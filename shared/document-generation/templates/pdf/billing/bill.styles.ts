export const billTemplateStyles = `
  .document-page {
    box-sizing: border-box;
    position: relative;
    width: 1123px;
    height: 794px;
    overflow: hidden;
    border: 1px solid #222;
    background: #fff;
    padding: 22px 29px;
    color: #171717;
    font-family: "Noto Sans Devanagari", "Mangal", "Fontasy_Himali_TT", Arial, sans-serif;
    font-size: 13px;
    line-height: 1.25;
  }
  .document-page, .document-page * { box-sizing: border-box; }
  .document-topline { display:flex; align-items:center; min-height:17px; color:#555; font-size:11px; }
  .document-header { display:grid; grid-template-columns:102px minmax(0,1fr) 190px; align-items:center; min-height:119px; border-bottom:2px solid #222; padding:2px 8px 8px; }
  .document-branding { display:contents; }
  .document-logo { display:flex; justify-content:center; align-items:center; }
  .document-logo img { width:82px; height:82px; object-fit:contain; }
  .document-organization { text-align:center; }
  .document-organization h1 { font-size:26px; font-weight:700; line-height:1.2; margin:0 0 2px; }
  .document-organization p { margin:1px 0; font-size:13px; }
  .document-organization .document-purpose { font-size:15px; font-weight:600; }
  .document-organization h2 { margin:0; font-size:17px; font-weight:700; }
  .document-contact-list { display:flex; flex-direction:column; align-self:center; border-left:1px solid #aebbd2; padding-left:10px; font-family:"Fontasy_Himali_TT", sans-serif; font-size:10px; line-height:1.35; }
  .document-contact-list strong { margin-bottom:3px; color:#294f9b; font-size:11px; }
  .document-identifiers { display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; align-items:center; min-height:29px; border-bottom:2px solid #222; padding:3px 9px; }
  .document-identifiers span:nth-child(2) { text-align:center; }
  .document-identifiers span:last-child { text-align:right; }
  .document-parties { display:grid; grid-template-columns:1.05fr .95fr; gap:2px 14px; padding:7px 12px 5px; }
  .document-party-line { min-width:0; }
  .document-party-line strong { font-weight:600; }
  .document-period { grid-column:1 / -1; }
  .document-items { width:100%; border-collapse:collapse; table-layout:fixed; }
  .document-items th, .document-items td { height:29px; border:1px solid #222; padding:3px 8px; font-weight:400; }
  .document-items th { height:28px; text-align:center; font-weight:600; }
  .document-col-index { width:5.5%; }
  .document-col-description { width:63%; }
  .document-col-rate { width:10%; }
  .document-col-total { width:11%; }
  .document-col-note { width:10.5%; }
  .document-center { text-align:center; }
  .document-number { text-align:right; white-space:nowrap; }
  .document-total-row td { font-weight:700; }
  .document-total-row td:nth-child(2) { text-align:right; }
  .document-remarks { margin-top:8px; border:1px solid #222; }
  .document-remarks p { min-height:23px; margin:0; border-bottom:1px solid #222; padding:3px 9px; }
  .document-remarks p:last-child { border-bottom:0; }
  .document-footer { position:absolute; right:45px; bottom:62px; left:45px; display:grid; grid-template-columns:1fr 1fr 1fr; align-items:end; }
  .document-signature { display:flex; width:max-content; min-width:175px; flex-direction:column; gap:2px; font-size:12px; }
  .document-signature-line { width:125px; border-top:1px solid #555; margin-bottom:2px; }
  .document-signature-right { justify-self:end; align-items:flex-end; text-align:right; }
  .document-clock { justify-self:center; color:#666; font-size:11px; }
  .document-english-date { color:#666; font-family:Arial,sans-serif; font-size:11px; }
  @media print {
    .document-page { width:297mm; height:210mm; border:1px solid #222; padding:5.8mm 7.7mm; }
  }
`;
