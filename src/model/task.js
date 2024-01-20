const mongoose = require("mongoose")

const taskSchema = new mongoose.Schema({
  title: String,
  description: String,
  due_date: Date,
  status: { type: String, default: 'TODO' },
  isDeleted: { type: Boolean, default: false },
  subtasks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Subtask' }],
  // user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, 
  deleted_at: { type: Date, default: null },
}); 

  
const Task = mongoose.model('Task', taskSchema);
module.exports = Task