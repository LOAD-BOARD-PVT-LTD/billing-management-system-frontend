import { z } from 'zod';

const dateValueSchema = z.union([z.string(), z.number()]).nullish();

const datePeriodSchema = z.object({
	StartBs: dateValueSchema,
	StartAd: dateValueSchema,
	ExpiryBs: dateValueSchema,
	ExpiryAd: dateValueSchema,
}).passthrough();

const vehicleDetailsDataSchema = z.object({
	VehicleId: z.union([z.string(), z.number()]).nullish(),
	VehicleNumber: z.string().nullish(),
	Compliance: z.object({
		Insurance: z.object({
			Company: z.string().nullish(),
			PolicyNumber: z.string().nullish(),
			PolicyType: z.string().nullish(),
			StartBs: dateValueSchema,
			StartAd: dateValueSchema,
			ExpiryBs: dateValueSchema,
			ExpiryAd: dateValueSchema,
		}).passthrough().nullish(),
		CheckPass: datePeriodSchema.nullish(),
		RoutePermit: z.object({
			Route: z.string().nullish(),
			StartBs: dateValueSchema,
			StartAd: dateValueSchema,
			ExpiryBs: dateValueSchema,
			ExpiryAd: dateValueSchema,
		}).passthrough().nullish(),
		Bluebook: datePeriodSchema.nullish(),
		BlueBook: datePeriodSchema.nullish(),
	}).passthrough().nullish(),
	Bluebook: datePeriodSchema.nullish(),
	BlueBook: datePeriodSchema.nullish(),
}).passthrough();

const vehicleDetailsResponseSchema = z.object({
	Code: z.union([z.string(), z.number()]).optional(),
	Message: z.string().optional(),
	Data: vehicleDetailsDataSchema,
}).passthrough();

export type TqmsVehicleDetails = z.infer<typeof vehicleDetailsDataSchema>;

export function parseTqmsVehicleDetailsResponse(payload: unknown): TqmsVehicleDetails {
	const result = vehicleDetailsResponseSchema.safeParse(payload);
	if (!result.success) {
		throw new Error('TQMS returned vehicle details in an unsupported format.');
	}

	return result.data.Data;
}
