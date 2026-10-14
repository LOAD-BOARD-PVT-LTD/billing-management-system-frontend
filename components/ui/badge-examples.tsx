   
                                 
   
                                                                                 
                                                 
   

'use client';

import { Badge } from './badge';
import { AlertCircle } from 'lucide-react';

export function BadgeExamples() {
  return (
    <div className="space-y-6 p-6">
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Status Badges</h2>
        
        {                                              }
        <div className="flex items-center gap-4">
          <Badge variant="active" showIcon>
            सक्रिय
          </Badge>
          <Badge variant="active">
            Active
          </Badge>
        </div>

        {                                                }
        <div className="flex items-center gap-4">
          <Badge variant="inactive" showIcon>
            निष्क्रिय
          </Badge>
          <Badge variant="inactive">
            Inactive
          </Badge>
        </div>

        {                                                  }
        <div className="flex items-center gap-4">
          <Badge variant="pending" showIcon pulse glow>
            प्रतीक्षा
          </Badge>
          <Badge variant="pending" pulse>
            Pending
          </Badge>
        </div>

        {                                  }
        <div className="flex items-center gap-4">
          <Badge variant="error" showIcon>
            त्रुटि
          </Badge>
          <Badge variant="error" showIcon>
            Error
          </Badge>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Sizes</h2>
        <div className="flex items-center gap-4">
          <Badge variant="success" size="sm">Small</Badge>
          <Badge variant="success" size="default">Default</Badge>
          <Badge variant="success" size="lg">Large</Badge>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Custom Icons</h2>
        <div className="flex items-center gap-4">
          <Badge variant="warning" icon={<AlertCircle className="h-3 w-3" />}>
            Custom Icon
          </Badge>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">All Variants</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="default">Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="destructive">Destructive</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="info">Info</Badge>
        </div>
      </section>
    </div>
  );
}

