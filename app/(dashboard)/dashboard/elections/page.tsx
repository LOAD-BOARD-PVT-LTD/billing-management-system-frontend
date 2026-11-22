'use client';

import { CalendarDays } from 'lucide-react';
import { NotFoundState } from '@/components/feedback';

export default function ElectionsNotFoundPage() {
  return (
    <NotFoundState
      code="404"
      badge="निर्वाचन मोड्युल"
      title="निर्वाचन व्यवस्थापन पृष्ठ फेला परेन"
      description="निर्वाचन व्यवस्थापन (Elections) सुविधा हाल यस प्रणालीमा उपलब्ध छैन वा निर्माणाधीन अवस्थामा छ।"
      icon={CalendarDays}
    />
  );
}
