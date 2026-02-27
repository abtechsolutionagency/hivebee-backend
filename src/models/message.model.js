import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    connectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Connection',
      required: true,
      index: true
    },
    senderUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000
    },
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
  },
  {
    timestamps: true,
    versionKey: false
  }
);

messageSchema.index({ connectionId: 1, createdAt: -1 });

export const Message = mongoose.model('Message', messageSchema);
