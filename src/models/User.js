const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  realName: { type: String, required: true },
  phone: { type: String },
  email: { type: String },
  roles: [{
    type: String,
    enum: ['admin', 'operator', 'inspector', 'repairer', 'resident', 'planner', 'collector'],
    required: true
  }],
  address: {
    province: String,
    city: String,
    district: String,
    street: String,
    buildingNo: String,
    roomNo: String,
    houseType: { type: String, enum: ['apartment', 'villa', 'townhouse', 'other'] },
    area: Number
  },
  location: {
    lat: Number,
    lng: Number
  },
  skills: [{ type: String }],
  status: { type: String, enum: ['active', 'inactive', 'on_leave'], default: 'active' },
  waterMeterNo: { type: String, unique: true, sparse: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
