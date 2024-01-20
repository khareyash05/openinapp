const mongoose = require("mongoose")

// Subtask Schema
const subtaskSchema = new mongoose.Schema({
    task_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
    status: { type: Number, default: 0 },
    isDeleted: { type: Boolean, default: false },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
    deleted_at: { type: Date, default: null },
});

const Subtask = mongoose.model('Subtask', subtaskSchema);

module.exports = Subtask;