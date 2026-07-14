// User model. One registered account can act as both lender and borrower;
// only 'admin' is a distinct role type. Sensitive fields (mfaSecret, phone,
// address) are stored already-encrypted; passwordHash and backup codes are
// hashed. Never store any of these in plaintext.
const mongoose = require('mongoose');

const trustedDeviceSchema = new mongoose.Schema(
  {
    uaHash: { type: String, required: true },
    ipPrefixHash: { type: String, required: true },
    lastSeen: { type: Date, default: Date.now },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: { type: String, required: true },
    passwordHistory: { type: [String], default: [] }, // last 5 hashes
    passwordChangedAt: { type: Date },

    mfaEnabled: { type: Boolean, default: false },
    mfaSecret: { type: String }, // AES-256-GCM encrypted at rest
    mfaBackupCodes: { type: [String], default: [] }, // argon2id-hashed

    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    emailVerified: { type: Boolean, default: false },

    profile: {
      bio: { type: String, default: '' },
      avatarUrl: { type: String, default: '' },
      location: { type: String, default: '' }, // free-text city/area
      phoneEncrypted: { type: String }, // AES-256-GCM
      addressEncrypted: { type: String }, // AES-256-GCM
    },

    notificationPrefs: {
      email: { type: Boolean, default: true },
      inApp: { type: Boolean, default: true },
    },

    status: {
      type: String,
      enum: ['active', 'suspended', 'deleted_pending'],
      default: 'active',
    },

    failedLoginAttempts: { type: Number, default: 0 },
    lockoutUntil: { type: Date },
    trustedDevices: { type: [trustedDeviceSchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
