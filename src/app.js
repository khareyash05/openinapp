const express = require("express")
const app = express()
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv')
require('dotenv').config()

const Task = require("./model/task")
const Subtask = require("./model/subtask")
const User = require("./model/user")

// middleware to authenticate users and check token id
const authenticateToken = require("./middleware/authenticateToken")

const port = process.env.PORT || 3000 ;
app.use(express.json())

require("./db/conn")
require("./cronJobs")

app.post('/register', async (req, res) => {
  try {
    const { name,phone_number, priority } = req.body;
    const newUser = new User({ name,phone_number, priority });
    await newUser.save();
    const token = generateToken(newUser._id);

    res.status(201).json({ user: newUser, token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const generateToken = (user_id) => {
  const secretKey = 'secret'; 
  const token = jwt.sign({ user_id }, secretKey, { expiresIn: '1h' });
  return token;
};
  
// 1. Create task
app.post('/tasks', authenticateToken, async (req, res) => {
    try {
      const { title, description, due_date } = req.body;
      const newTask = new Task({ title, description, due_date });
      await newTask.save();
      res.status(201).json(newTask);
    } catch (error) {
      res.status(500).json({ error: "Idhar aaya kya"+error.message });
    }
});
  
// 2. Create subtask
app.post('/tasks/:task_id/subtasks', authenticateToken, async (req, res) => {
    try {
      const { task_id } = req.params;
      const newSubtask = new Subtask({ task_id });
      await newSubtask.save();
      const task = await Task.findByIdAndUpdate(task_id, { $push: { subtasks: newSubtask._id } });
      res.status(201).json({ task, subtask: newSubtask });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
});
  
// 3. Get all user tasks
app.get('/tasks', authenticateToken, async (req, res) => {
    try {
      const { priority, due_date, page, limit } = req.query;
      const query = {
        isDeleted: false,
        ...(priority && { priority }),
        ...(due_date && { due_date: { $lte: new Date(due_date) } }),
      };
  
      const tasks = await Task.find(query)
        .skip((page - 1) * limit)
        .limit(limit)
        .exec();
  
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
});
  
  // 4. Get all user subtasks
app.get('/tasks/:task_id/subtasks', authenticateToken, async (req, res) => {
    try {
      const { task_id } = req.query;
      const query = {
        isDeleted: false,
        ...(task_id && { task_id }),
      };
  
      const subtasks = await Subtask.find(query).exec();
      res.json(subtasks);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
});
  
  // 5. Update task
app.patch('/tasks/:id', authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const { due_date,status } = req.body;
      const updatedTask = await Task.findByIdAndUpdate(
        id,
        {due_date,status}
      );
  
      res.json(updatedTask);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
});
  
// 6. Update subtask
app.patch('/tasks/:task_id/subtasks/:id', authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const updatedSubtask = await Subtask.findByIdAndUpdate(id, { status });
  
      res.json(updatedSubtask);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
});
  
// 7. Delete task (soft deletion)
app.delete('/tasks/:id', authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const deletedTask = await Task.findByIdAndUpdate(id, { isDeleted: true ,deleted_at: new Date()});       
      res.json(deletedTask);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
});
  
// 8. Delete subtask (soft deletion)
app.delete('/tasks/:task_id/subtasks/:id', authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const deletedSubtask = await Subtask.findByIdAndUpdate(id, { isDeleted: true, deleted_at: new Date() });  
      res.json(deletedSubtask);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
});
  
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
