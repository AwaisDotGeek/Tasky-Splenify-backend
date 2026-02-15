import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  email: string;
  username: string;
  passwordHash?: string;
  name: string;
  authProvider: 'local' | 'google';
  googleId?: string;
  isOnline: boolean;
  lastSeen: Date;
  conversationReadStatus: Map<string, Date>;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
    },
    passwordHash: {
      type: String,
      required: function(this: IUser) {
        return this.authProvider === 'local';
      }
    },
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [30, 'Username must not exceed 30 characters']
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: [1, 'Name must be at least 1 character'],
      maxlength: [100, 'Name must not exceed 100 characters']
    },
    authProvider: {
      type: String,
      enum: ['local', 'google'],
      required: true,
      default: 'local'
    },
    googleId: {
      type: String,
      sparse: true,
      unique: true,
      index: true
    },
    isOnline: {
      type: Boolean,
      default: false
    },
    lastSeen: {
      type: Date,
      default: Date.now
    },
    conversationReadStatus: {
      type: Map,
      of: Date,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

// Remove password hash from JSON responses
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.passwordHash;
  delete user.__v;
  return user;
};

export const User = mongoose.model<IUser>('User', userSchema);
