import mongoose from 'mongoose';

const matchSubmissionSchema = new mongoose.Schema(
  {
    primaryUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    workerUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    candidateUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    workerDecision: {
      type: String,
      enum: ['sweet', 'sting'],
      required: true
    },
    workerNote: {
      type: String,
      trim: true,
      maxlength: 500
    },
    primaryDecision: {
      type: String,
      enum: ['sweet', 'sting'],
      default: null
    },
    primaryReviewedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

matchSubmissionSchema.index({ primaryUserId: 1, workerUserId: 1, candidateUserId: 1 }, { unique: true });
matchSubmissionSchema.index({ primaryUserId: 1, primaryDecision: 1, createdAt: -1 });

export const MatchSubmission = mongoose.model('MatchSubmission', matchSubmissionSchema);
