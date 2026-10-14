export const dotMatrixReceiptStyles = `
  .dot-matrix-receipt {
    box-sizing: border-box;
    width: 794px;
    min-height: 562px;
    padding: 22px 28px 28px;
    background: #fff;
    color: #171717;
    font-family: "Noto Sans Devanagari", "Mangal", "Fontasy_Himali_TT", Arial, sans-serif;
    font-size: 13px;
    line-height: 1.35;
  }
  .dot-matrix-receipt, .dot-matrix-receipt * { box-sizing: border-box; }
  .dot-matrix-topline {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    border-bottom: 1px solid #aebbd2;
    padding-bottom: 5px;
    color: #475569;
    font-size: 11px;
  }
  .dot-matrix-header {
    display: grid;
    grid-template-columns: 72px minmax(0, 1fr) 160px;
    align-items: center;
    gap: 12px;
    min-height: 104px;
    border-bottom: 1px solid #aebbd2;
    padding: 10px 0;
  }
  .dot-matrix-logo { display: flex; align-items: center; justify-content: center; }
  .dot-matrix-logo img { width: 64px; height: 64px; object-fit: contain; }
  .dot-matrix-organization { text-align: center; }
  .dot-matrix-organization h1 { margin: 0; color: #294f9b; font-size: 17px; font-weight: 700; }
  .dot-matrix-organization p { margin: 2px 0 0; font-size: 10px; }
  .dot-matrix-organization h2 {
    display: inline-block;
    margin: 7px 0 0;
    background: #294f9b;
    padding: 3px 16px;
    color: #fff;
    font-size: 13px;
  }
  .dot-matrix-contact { border-left: 1px solid #aebbd2; padding-left: 10px; font-size: 10px; }
  .dot-matrix-contact strong { display: block; margin-bottom: 3px; color: #294f9b; }
  .dot-matrix-identifiers {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 8px;
    border-bottom: 1px solid #aebbd2;
    padding: 7px 4px;
  }
  .dot-matrix-identifiers span:last-child { text-align: right; }
  .dot-matrix-party {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 7px 18px;
    padding: 11px 8px;
  }
  .dot-matrix-party > div { min-width: 0; overflow-wrap: anywhere; }
  .dot-matrix-party strong { font-weight: 600; }
  .dot-matrix-period { grid-column: 1 / -1; }
  .dot-matrix-items { width: 100%; border-collapse: collapse; table-layout: fixed; }
  .dot-matrix-items th, .dot-matrix-items td { border: 1px solid #aebbd2; padding: 6px 8px; }
  .dot-matrix-items th { background: #ebf0fa; color: #1e293b; font-weight: 600; text-align: center; }
  .dot-matrix-items th:first-child { width: 9%; }
  .dot-matrix-items th:last-child { width: 25%; }
  .dot-matrix-number { text-align: right; white-space: nowrap; }
  .dot-matrix-center { text-align: center; }
  .dot-matrix-total td { font-weight: 700; }
  .dot-matrix-total td:nth-child(2) { text-align: right; }
  .dot-matrix-summary { margin-top: 9px; border: 1px solid #aebbd2; }
  .dot-matrix-summary p { margin: 0; border-bottom: 1px solid #d7deea; padding: 6px 9px; }
  .dot-matrix-summary p:last-child { border-bottom: 0; }
  .dot-matrix-note { overflow-wrap: anywhere; }
  .dot-matrix-signatures {
    display: flex;
    justify-content: space-between;
    gap: 24px;
    margin-top: 38px;
    padding: 0 12px;
  }
  .dot-matrix-signature { display: flex; width: 170px; flex-direction: column; gap: 4px; font-size: 11px; }
  .dot-matrix-signature:last-child { align-items: flex-end; text-align: right; }
  .dot-matrix-signature-line { width: 125px; border-top: 1px solid #64748b; margin-bottom: 3px; }
  @media print {
    .dot-matrix-receipt { width: 210mm; min-height: 148.5mm; padding: 6mm 7.5mm; }
  }
`;
