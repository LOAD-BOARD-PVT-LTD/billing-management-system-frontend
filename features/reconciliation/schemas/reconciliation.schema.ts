import { z } from 'zod';

export const reconciliationOptionSchema = z.enum(['KEEP_BILLING', 'UPDATE_TQMS', 'CREATE_NEW_MEMBER']);

export const reconciliationDecisionSchema = z
	.object({
		option: reconciliationOptionSchema,
		reason: z.string().trim(),
		performedBy: z.string().trim().min(1, 'सम्पादनकर्ता पहिचान आवश्यक छ।'),
	})
	.superRefine((data, ctx) => {
		if (data.option !== 'KEEP_BILLING' && (!data.reason || data.reason.trim().length < 3)) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'विवरण अद्यावधिक गर्नका लागि कम्तीमा ३ अक्षरको कारण वा कैफियत उल्लेख गर्नुपर्छ।',
				path: ['reason'],
			});
		}
	});

export type ReconciliationDecisionFormData = z.infer<typeof reconciliationDecisionSchema>;

