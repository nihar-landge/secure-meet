const mongoose = require('mongoose');

const MeetingSchema = new mongoose.Schema({
  joinCode: { type: String, required: true, unique: true },
  meetLink: { type: String, required: true },
  hostEmail: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Meeting', MeetingSchema);
