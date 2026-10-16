'use client';

import { getNepaliDateParts } from '@/utils/nepali-calender-dates/nepali-fiscal-year';
import { toNepaliDigits } from '@/utils/numbers';
import { motion } from 'framer-motion';
import { useOrganization } from '@/contexts/organization-context';

export function LoginFooter() {
  const { organization } = useOrganization();
  const currentYear = toNepaliDigits(getNepaliDateParts(new Date()).year);

  return (
    <motion.div
      className="text-center"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.4 }}
    >
      <p className="text-xs text-muted-foreground font-medium">
        © {currentYear} {organization.nameNepali}
      </p>
    </motion.div>
  );
}
