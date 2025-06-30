import { ObjectId } from "mongodb";
import { z } from "zod";

// Zod schema for incoming request payload
const TransactionSchema = z.object({
  _id: z
    .string()
    .refine((val) => ObjectId.isValid(val), {
      message: "Invalid ObjectId format",
    })
    .optional(),
  value: z.number(),
  tags: z.array(z.string()).default([]),
  name: z.string().min(1, "Name is required"),
  description: z.string().default(""),
  date: z
    .string()
    .optional()
    .default(() => new Date().toISOString())
    .refine((date) => !date || !isNaN(new Date(date).getTime()), {
      message: "Invalid date format",
    }),
  imported: z.boolean().default(false),
});

// After parsing, you'll need to convert _id (if present) to ObjectId
// Example usage:
export function parseTransaction(data: unknown) {
  const parsed = TransactionSchema.parse(data);
  return {
    ...parsed,
    _id: parsed._id ? new ObjectId(parsed._id) : new ObjectId(),
  };
}

export type Transaction = ReturnType<typeof parseTransaction>;

export default TransactionSchema;
