'use client';

import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useFontasyHimali } from '@/contexts/fontasy-himali-context';
import { Languages } from 'lucide-react';

export function FontasyHimaliControl() {
  const { enabled, setEnabled } = useFontasyHimali();

  return (
    <Card className="flex items-start gap-3 rounded-lg border-border/80 p-4 shadow-none">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-700">
        <Languages className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <label htmlFor="fontasy-himali-toggle" className="text-sm font-semibold">
          फन्टासी हिमाली TT नेपाली टाइपिङ
        </label>
        <p id="fontasy-himali-description" className="mt-1 text-xs leading-5 text-muted-foreground">
          सक्षम गर्दा साधारण text input र textarea मा टाइप गरिएको Fontasy Himali TT लाई नेपाली Unicode मा रूपान्तरण गर्छ।
          यो सेटिङ यस ब्राउजरमा सुरक्षित हुन्छ।
        </p>
      </div>
      <Checkbox
        id="fontasy-himali-toggle"
        role="switch"
        aria-checked={enabled}
        aria-describedby="fontasy-himali-description"
        checked={enabled}
        onCheckedChange={(checked) => setEnabled(checked === true)}
        className="mt-1"
      />
    </Card>
  );
}
