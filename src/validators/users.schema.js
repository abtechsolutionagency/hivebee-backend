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
const flexibleStringList = z.array(z.string().trim().min(1)).max(50).optional();
const flexibleString = () => z.string().trim().min(1).optional();

const idealMatchBaseSchema = z.object({
  lookingFor: genderSchema.optional(),
  minAge: z.number().int().min(18).max(100).optional(),
  maxAge: z.number().int().min(18).max(100).optional(),
  faithPreferences: flexibleStringList,
  familyGoalsPreferences: flexibleStringList,
  heightPreference: flexibleString(),
  ethnicityPreference: flexibleStringList,
  hairColorPreference: flexibleStringList,
  eyeColorPreference: flexibleStringList,
  fitnessPreference: flexibleStringList,
  eatingHabitsPreference: flexibleStringList
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
  christianDenomination: z.string().trim().optional(),
  faithImportance: z.string().trim().optional(),
  coreValues: flexibleStringList,
  interests: flexibleStringList
});

const lifestyleSchema = z.object({
  wantsChildren: z.string().trim().optional(),
  marriageTimeline: z.string().trim().optional(),
  drinkingHabit: z.string().trim().optional(),
  smokingHabit: z.string().trim().optional(),
  exerciseFrequency: z.string().trim().optional()
});

const primaryProfileRequiredSchema = z.object({
  displayName: z.string().trim().min(2),
  age: z.number().int().min(18).max(100),
  gender: genderSchema,
  location: z.string().trim().min(2),
  occupation: z.string().trim().optional(),
  educationLevel: z.string().trim().optional(),
  height: z.string().trim().optional(),
  ethnicity: z.string().trim().optional(),
  workoutStyle: z.string().trim().optional(),
  eatingStyle: z.string().trim().optional(),
  aboutMe: z.string().trim().optional(),
  picture: z.string().url().optional(),
  photos: z.array(z.string().url()).optional(),
  faithAndValues: faithAndValuesSchema.optional(),
  lifestyle: lifestyleSchema.optional(),
  idealMatch: withAgeRangeCheck(idealMatchBaseSchema).optional()
});

const primaryProfileUpdateSchema = z.object({
  displayName: z.string().trim().min(2).optional(),
  age: z.number().int().min(18).max(100).optional(),
  gender: genderSchema.optional(),
  location: z.string().trim().min(2).optional(),
  occupation: z.string().trim().optional(),
  educationLevel: z.string().trim().optional(),
  height: z.string().trim().optional(),
  ethnicity: z.string().trim().optional(),
  workoutStyle: z.string().trim().optional(),
  eatingStyle: z.string().trim().optional(),
  aboutMe: z.string().trim().optional(),
  picture: z.string().url().optional(),
  photos: z.array(z.string().url()).optional(),
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

export const generatePrimaryBioSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
  age: z.number().int().min(18).max(100),
  occupation: z.string().trim().min(1).max(80),
  location: z.string().trim().max(120).optional(),
  educationLevel: z.string().trim().max(80).optional()
});

export const polishPrimaryBioSchema = z.object({
  bio: z.string().trim().min(10).max(500)
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
