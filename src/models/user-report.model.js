import mongoose from 'mongoose';

const userReportSchema = new mongoose.Schema(
  {
    reporterUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    reportedUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120
    },
    details: {
      type: String,
      trim: true,
      maxlength: 1000
    },
    status: {
      type: String,
      enum: ['open', 'reviewed', 'resolved'],
      default: 'open'
    },
    moderatorNote: {
      type: String,
      trim: true,
      maxlength: 500
    },
    moderatedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

userReportSchema.index({ reporterUserId: 1, reportedUserId: 1, createdAt: -1 });

export const UserReport = mongoose.model('UserReport', userReportSchema);
