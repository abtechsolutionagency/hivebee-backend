import { z } from 'zod';

export const SYSTEM_ROLES = ['king_bee', 'queen_bee', 'worker_bee', 'admin'];
export const PRIMARY_USER_ROLES = ['king_bee', 'queen_bee'];

const genderSchema = z.enum(['man', 'woman']);
const subscriptionPlanSchema = z.enum([
  'starter_hive',
  'growth_hive',
  'royal_hive'
]);
const selectionList = (maxItems) => z.array(z.string().min(1).max(64)).max(maxItems);

const idealMatchBaseSchema = z.object({
  lookingFor: genderSchema.optional(),
  minAge: z.number().int().min(18).max(100).optional(),
  maxAge: z.number().int().min(18).max(100).optional(),
  faithPreferences: selectionList(8).optional(),
  familyGoalsPreferences: selectionList(6).optional(),
  heightPreference: z.string().min(1).max(40).optional(),
  ethnicityPreference: z.string().min(1).max(64).optional(),
  hairColorPreference: z.string().min(1).max(32).optional(),
  fitnessPreference: z.string().min(1).max(32).optional(),
  eatingHabitsPreference: z.string().min(1).max(32).optional()
});

const withAgeRangeCheck = (schema) =>
  schema.refine(
    (payload) => {
      if (payload.minAge && payload.maxAge) {
        return payload.minAge <= payload.maxAge;
      }
      return true;
    },
    { message: 'minAge must be less than or equal to maxAge' }
  );

const faithAndValuesSchema = z.object({
  christianDenomination: z.string().min(1).max(64).optional(),
  faithImportance: z.string().min(1).max(64).optional(),
  coreValues: selectionList(6).optional(),
  interests: selectionList(6).optional()
});

const lifestyleSchema = z.object({
  wantsChildren: z.string().min(1).max(64).optional(),
  marriageTimeline: z.string().min(1).max(64).optional(),
  drinkingHabit: z.string().min(1).max(64).optional(),
  smokingHabit: z.string().min(1).max(64).optional(),
  exerciseFrequency: z.string().min(1).max(64).optional()
});

const primaryProfileRequiredSchema = z.object({
  displayName: z.string().min(2).max(80),
  age: z.number().int().min(18).max(100),
  gender: genderSchema,
  location: z.string().min(2).max(120),
  occupation: z.string().max(80).optional(),
  educationLevel: z.string().max(80).optional(),
  height: z.string().max(40).optional(),
  ethnicity: z.string().max(64).optional(),
  workoutStyle: z.string().max(64).optional(),
  eatingStyle: z.string().max(64).optional(),
  aboutMe: z.string().max(500).optional(),
  photos: z.array(z.string().url()).max(6).optional(),
  faithAndValues: faithAndValuesSchema.optional(),
  lifestyle: lifestyleSchema.optional(),
  idealMatch: withAgeRangeCheck(idealMatchBaseSchema).optional()
});

const primaryProfileUpdateSchema = z.object({
  displayName: z.string().min(2).max(80).optional(),
  age: z.number().int().min(18).max(100).optional(),
  gender: genderSchema.optional(),
  location: z.string().min(2).max(120).optional(),
  occupation: z.string().max(80).optional(),
  educationLevel: z.string().max(80).optional(),
  height: z.string().max(40).optional(),
  ethnicity: z.string().max(64).optional(),
  workoutStyle: z.string().max(64).optional(),
  eatingStyle: z.string().max(64).optional(),
  aboutMe: z.string().max(500).optional(),
  photos: z.array(z.string().url()).max(6).optional(),
  faithAndValues: faithAndValuesSchema.optional(),
  lifestyle: lifestyleSchema.optional(),
  idealMatch: withAgeRangeCheck(idealMatchBaseSchema).optional()
});

export const registerUserSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(32)
    .regex(/^[a-zA-Z0-9_.-]+$/),
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(72),
  role: z.enum(PRIMARY_USER_ROLES)
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72)
});

export const verifyEmailSchema = z.object({
  token: z.string().min(20).max(256)
});

export const resendVerificationSchema = z.object({
  email: z.string().email().optional()
});

export const createWorkerInviteSchema = z.object({
  inviteeEmail: z.string().email().optional(),
  expiresInDays: z.number().int().min(1).max(30).optional()
});

export const workerSignupSchema = z.object({
  inviteCode: z.string().min(10).max(128),
  username: z
    .string()
    .min(3)
    .max(32)
    .regex(/^[a-zA-Z0-9_.-]+$/),
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(72)
});

export const createSubscriptionCheckoutSchema = z.object({
  plan: subscriptionPlanSchema
});

export const changeSubscriptionPlanSchema = z.object({
  plan: subscriptionPlanSchema
});

export const createUserSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(32)
    .regex(/^[a-zA-Z0-9_.-]+$/),
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(72),
  role: z.enum(SYSTEM_ROLES).optional()
});

export const registerPrimaryUserSchema = z.object({
  email: z.string().email(),
  role: z.enum(PRIMARY_USER_ROLES),
  primaryProfile: primaryProfileRequiredSchema
});

export const updatePrimaryProfileSchema = primaryProfileUpdateSchema.refine(
  (value) => Object.keys(value).length > 0,
  { message: 'At least one field must be provided' }
);

export const updateUserSchema = z
  .object({
    name: z.string().min(2).max(80).optional(),
    email: z.string().email().optional(),
    role: z.enum(SYSTEM_ROLES).optional(),
    isActive: z.boolean().optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided'
  });
