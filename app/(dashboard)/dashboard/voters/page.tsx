'use client';

import { Vote } from 'lucide-react';
import { NotFoundState } from '@/components/feedback';

export default function VotersNotFoundPage() {
  return (
    <NotFoundState
      code="404"
      badge="मतदाता सूची मोड्युल"
      title="मतदाता सूची पृष्ठ फेला परेन"
      description="मतदाता सूची (Voter List) सुविधा हाल यस प्रणालीमा उपलब्ध छैन वा निर्माणाधीन अवस्थामा छ।"
      icon={Vote}
    />
  );
}
