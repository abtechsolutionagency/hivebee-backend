import mongoose from 'mongoose';

const subscriptionTierSchema = new mongoose.Schema(
  {
    planCode: {
      type: String,
      enum: ['starter_hive', 'growth_hive', 'royal_hive'],
      required: true,
      unique: true,
      index: true
    },
    displayName: { type: String, required: true, trim: true, maxlength: 80 },
    monthlyPriceUsd: { type: Number, required: true, min: 0 },
    workerLimit: { type: Number, required: true, min: 0 },
    suggestionsPerMonth: { type: Number, default: null },
    searchPriorityWeight: { type: Number, required: true, min: 0, default: 0 },
    stripePriceId: { type: String, default: '' },
    isActive: { type: Boolean, default: true }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

export const SubscriptionTier = mongoose.model('SubscriptionTier', subscriptionTierSchema);
