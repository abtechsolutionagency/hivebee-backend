import mongoose from 'mongoose';

const workerInviteSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    primaryUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    inviteeEmail: {
      type: String,
      lowercase: true,
      trim: true
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'expired', 'revoked'],
      default: 'pending'
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true
    },
    acceptedAt: {
      type: Date
    },
    acceptedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

export const WorkerInvite = mongoose.model('WorkerInvite', workerInviteSchema);
