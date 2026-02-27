import mongoose from 'mongoose';

const connectionSchema = new mongoose.Schema(
  {
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
    pairKey: { type: String, required: true, unique: true, index: true },
    messagingUnlocked: { type: Boolean, default: true },
    unlockedAt: { type: Date, default: Date.now },
    source: {
      type: String,
      enum: ['mutual_sweet'],
      default: 'mutual_sweet'
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

connectionSchema.index({ users: 1 });

export const Connection = mongoose.model('Connection', connectionSchema);
