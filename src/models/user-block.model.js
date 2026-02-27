import mongoose from 'mongoose';

const userBlockSchema = new mongoose.Schema(
  {
    blockerUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    blockedUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

userBlockSchema.index({ blockerUserId: 1, blockedUserId: 1 }, { unique: true });

export const UserBlock = mongoose.model('UserBlock', userBlockSchema);
