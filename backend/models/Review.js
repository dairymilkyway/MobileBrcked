const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ReviewSchema = new Schema({
  UserID: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  Name: {
    type: String,
    required: true
  },
  ProductID: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  Productname: {
    type: String,
    required: true
  },
  Rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  Comment: {
    type: String,
    required: true
  },
  Reviewdate: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Review', ReviewSchema);
