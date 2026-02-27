import mongoose from 'mongoose';
import { SUBSCRIPTION_STATUSES } from '../constants/subscription-plans.js';

const faithAndValuesSchema = new mongoose.Schema(
  {
    christianDenomination: { type: String, trim: true },
    faithImportance: { type: String, trim: true },
    coreValues: { type: [String], default: [] },
    interests: { type: [String], default: [] }
  },
  { _id: false }
);

const lifestyleSchema = new mongoose.Schema(
  {
    wantsChildren: { type: String, trim: true },
    marriageTimeline: { type: String, trim: true },
    drinkingHabit: { type: String, trim: true },
    smokingHabit: { type: String, trim: true },
    exerciseFrequency: { type: String, trim: true }
  },
  { _id: false }
);

const idealMatchSchema = new mongoose.Schema(
  {
    lookingFor: { type: String, enum: ['man', 'woman'] },
    minAge: { type: Number, min: 18, max: 100 },
    maxAge: { type: Number, min: 18, max: 100 },
    faithPreferences: { type: [String], default: [] },
    familyGoalsPreferences: { type: [String], default: [] },
    heightPreference: { type: String, trim: true },
    ethnicityPreference: { type: String, trim: true },
    hairColorPreference: { type: String, trim: true },
    fitnessPreference: { type: String, trim: true },
    eatingHabitsPreference: { type: String, trim: true }
  },
  { _id: false }
);

const primaryProfileSchema = new mongoose.Schema(
  {
    displayName: { type: String, trim: true, minlength: 2, maxlength: 80 },
    age: { type: Number, min: 18, max: 100 },
    gender: { type: String, enum: ['man', 'woman'] },
    location: { type: String, trim: true, maxlength: 120 },
    occupation: { type: String, trim: true, maxlength: 80 },
    educationLevel: { type: String, trim: true, maxlength: 80 },
    height: { type: String, trim: true, maxlength: 40 },
    ethnicity: { type: String, trim: true, maxlength: 64 },
    workoutStyle: { type: String, trim: true, maxlength: 64 },
    eatingStyle: { type: String, trim: true, maxlength: 64 },
    aboutMe: { type: String, trim: true, maxlength: 500 },
    photos: { type: [String], default: [] },
    faithAndValues: { type: faithAndValuesSchema },
    lifestyle: { type: lifestyleSchema },
    idealMatch: { type: idealMatchSchema }
  },
  { _id: false }
);

const subscriptionSchema = new mongoose.Schema(
  {
    plan: {
      type: String,
      enum: ['starter_hive', 'growth_hive', 'royal_hive']
    },
    status: {
      type: String,
      enum: SUBSCRIPTION_STATUSES,
      default: 'inactive'
    },
    stripeCustomerId: { type: String },
    stripeSubscriptionId: { type: String },
    stripeCheckoutSessionId: { type: String },
    trialEligible: { type: Boolean, default: false },
    trialUsed: { type: Boolean, default: false },
    trialEndsAt: { type: Date },
    cancelAtPeriodEnd: { type: Boolean, default: false },
    currentPeriodEnd: { type: Date },
    paymentFailureReason: { type: String, maxlength: 300 },
    paymentFailedAt: { type: Date },
    searchPriorityWeight: { type: Number, default: 0 }
  },
  { _id: false }
);

const workerAccountSchema = new mongoose.Schema(
  {
    primaryUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    joinedAt: { type: Date }
  },
  { _id: false }
);

const emailVerificationSchema = new mongoose.Schema(
  {
    tokenHash: { type: String, select: false },
    expiresAt: { type: Date },
    requestedAt: { type: Date },
    verifiedAt: { type: Date }
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 32
    },
    name: {
      type: String,
      trim: true,
      minlength: 2,
      maxlength: 80
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    passwordHash: {
      type: String,
      required: true,
      select: false
    },
    role: {
      type: String,
      enum: ['king_bee', 'queen_bee', 'worker_bee', 'admin'],
      default: 'worker_bee'
    },
    accountStatus: {
      type: String,
      enum: ['active', 'suspended', 'banned'],
      default: 'active',
      index: true
    },
    suspendedAt: { type: Date, default: null },
    bannedAt: { type: Date, default: null },
    moderation: {
      reason: { type: String, maxlength: 300, default: null },
      updatedAt: { type: Date, default: null }
    },
    emailVerified: {
      type: Boolean,
      default: false
    },
    emailVerification: {
      type: emailVerificationSchema,
      default: undefined
    },
    profileCompleted: {
      type: Boolean,
      default: false
    },
    primaryProfile: {
      type: primaryProfileSchema,
      default: undefined
    },
    subscription: {
      type: subscriptionSchema,
      default: () => ({ status: 'inactive' })
    },
    workerAccount: {
      type: workerAccountSchema,
      default: undefined
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

export const User = mongoose.model('User', userSchema);
