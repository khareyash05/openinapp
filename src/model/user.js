const mongoose = require('mongoose');

// User Schema
const userSchema = new mongoose.Schema({
  name:String,
  phone_number: { type: Number, required: true },
  priority: { type: Number, enum: [-1, 0, 1, 2, 3], required: true },
  tasks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
});

// Create a User model
const User = mongoose.model('User', userSchema);

module.exports = User;