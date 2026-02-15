import mongoose, { Document, Schema } from 'mongoose';

export interface IGroup extends Document {
  name: string;
  creatorId: mongoose.Types.ObjectId;
  memberIds: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const groupSchema = new Schema<IGroup>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 100
    },
    creatorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    memberIds: [{
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true
    }]
  },
  {
    timestamps: true
  }
);

// Validation: minimum 2 members, maximum 50
groupSchema.pre('save', function(next) {
  if (this.memberIds.length < 2) {
    next(new Error('Group must have at least 2 members'));
  } else if (this.memberIds.length > 50) {
    next(new Error('Group cannot have more than 50 members'));
  } else {
    next();
  }
});

export const Group = mongoose.model<IGroup>('Group', groupSchema);
