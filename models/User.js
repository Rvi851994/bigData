const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    require: true,
  },
  email: {
    type: String,
    require: true,
  },
  schedule: {
    type: Date,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  batch_id: {
    type: String
  },
  failed: {
    type: Boolean,
    default: false,
  }
});

module.exports = User = mongoose.model('user', UserSchema);
