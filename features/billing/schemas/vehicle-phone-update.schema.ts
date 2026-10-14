import { z } from 'zod';

export const vehiclePhoneUpdateSchema = z.object({
	phone: z.string()
		.trim()
		.min(1, 'सक्रिय SMS नम्बर आवश्यक छ।')
		.max(32, 'फोन नम्बर धेरै लामो भयो।')
		.regex(/^\+?[0-9][0-9\s\-()]{5,30}$/u, 'मान्य फोन नम्बर लेख्नुहोस्।'),
	reason: z.string().trim().min(1, 'नम्बर परिवर्तनको कारण लेख्नुहोस्।').max(500, 'कारण ५०० अक्षरभन्दा छोटो हुनुपर्छ।'),
});

export type VehiclePhoneUpdateInput = z.infer<typeof vehiclePhoneUpdateSchema>;
