import { DotMatrixReceiptTemplate } from './dot-matrix-receipt.template';
import type { ReceiptTemplateProps } from '../../../types/template.types';

export function ReceiptTemplate(props: ReceiptTemplateProps) {
  return <DotMatrixReceiptTemplate {...props} />;
}
