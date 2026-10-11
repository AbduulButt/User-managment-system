import { z } from "zod";

export const chatbotCommandSchema = z.object({
  action: z.enum([
    "add_user",
    "update_user",
    "delete_user",
    "find_user",
    "list_users",
    "unknown",
  ]),

  email: z.string().nullable(),

  fullName: z.string().nullable(),

  phone: z.string().nullable(),

  city: z.string().nullable(),

  updateField: z
    .enum(["full_name", "email", "phone", "city"])
    .nullable(),

  updateValue: z.string().nullable(),

  message: z.string(),
});

export type ChatbotCommand = z.infer<
  typeof chatbotCommandSchema
>;