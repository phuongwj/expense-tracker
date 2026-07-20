import { z } from "zod";

const categoryAmountSchema = z.object({
  category: z.string().trim().min(1, "Category is required."),
  amount: z.number().nonnegative("Amount must be 0 or greater."),
});

const recurringExpenseSchema = z.object({
  name: z.string().trim().min(1, "Recurring expense name is required."),
  amount: z.number().nonnegative("Amount must be 0 or greater."),
});

const memberContributionSchema = z.object({
  memberName: z.string().trim().min(1, "Member name is required."),
  paid: z.number().nonnegative("Paid amount must be 0 or greater."),
  share: z.number().nonnegative("Share amount must be 0 or greater."),
  balance: z.number(),
});

export const personalInsightsSummarySchema = z.object({
  scope: z.literal("personal"),
  period: z.string().trim().min(1, "Period is required."),
  totalIncome: z.number().nonnegative("Total income must be 0 or greater."),
  totalExpenses: z.number().nonnegative("Total expenses must be 0 or greater."),
  netBalance: z.number(),
  topCategories: z.array(categoryAmountSchema).default([]),
  recurringExpenses: z.array(recurringExpenseSchema).default([]),
});

export const groupInsightsSummarySchema = z.object({
  scope: z.literal("group"),
  period: z.string().trim().min(1, "Period is required."),
  groupName: z.string().trim().min(1, "Group name is required."),
  totalGroupExpenses: z
    .number()
    .nonnegative("Total group expenses must be 0 or greater."),
  topCategories: z.array(categoryAmountSchema).default([]),
  memberContributions: z.array(memberContributionSchema).default([]),
});

export const insightsSummarySchema = z.discriminatedUnion("scope", [
  personalInsightsSummarySchema,
  groupInsightsSummarySchema,
]);

export const insightsRequestBodySchema = z
  .union([insightsSummarySchema, z.object({}).strict()])
  .optional();

export type PersonalInsightsSummary = z.infer<
  typeof personalInsightsSummarySchema
>;
export type GroupInsightsSummary = z.infer<typeof groupInsightsSummarySchema>;
export type InsightsSummary = z.infer<typeof insightsSummarySchema>;
export type InsightsRequestBody = z.infer<typeof insightsRequestBodySchema>;
