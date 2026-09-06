const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      lowercase: true,
      minlength: [2, 'Username must be at least 2 characters'],
      maxlength: [30, 'Username cannot exceed 30 characters'],
      index: true,
    },
    displayName: {
      type: String,
      trim: true,
      maxlength: [50, 'Display name cannot exceed 50 characters'],
      default: '',
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      sparse: true,
      index: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [4, 'Password must be at least 4 characters'],
      select: false, // Do not return password by default in queries
    },
    avatarUrl: {
      type: String,
      default: '',
    },
    bio: {
      type: String,
      trim: true,
      maxlength: [200, 'Bio cannot exceed 200 characters'],
      default: '',
    },
    status: {
      type: String,
      enum: ['ONLINE', 'AWAY', 'OFFLINE'],
      default: 'OFFLINE',
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    aiPreferences: {
      systemPromptCustomization: { type: String, default: '' },
      autoSuggestReplies: { type: Boolean, default: true },
      preferredModel: { type: String, default: 'gemini-2.5-flash' },
    },
  },
  {
    timestamps: true,
  }
);

// Hash password prior to saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Instance method to verify password
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Virtual for avatar fallback
UserSchema.virtual('avatar').get(function () {
  if (this.avatarUrl && this.avatarUrl.trim() !== '') {
    return this.avatarUrl;
  }
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(this.displayName || this.username)}&background=0D8ABC&color=fff&rounded=true&bold=true`;
});

UserSchema.set('toJSON', { virtuals: true });
UserSchema.set('toObject', { virtuals: true });

const User = mongoose.models.User || mongoose.model('User', UserSchema);

module.exports = User;
