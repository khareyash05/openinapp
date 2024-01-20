const express = require("express")
const app = express()
const jwt = require('jsonwebtoken');
const twilio =require('twilio')
const cron = require('node-cron')
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

app.post('/register', async (req, res) => {
  try {
    const { phone_number, priority } = req.body;
    const newUser = new User({ phone_number, priority });
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


// Schedule the cron job to run every day at midnight
cron.schedule('0 0 * * *', async () => {
  try {
    const currentDate = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Find tasks that have passed their due_date
    const overdueTasks = await Task.find({ due_date: { $lt: currentDate }, isDeleted: false }).exec();

    // Find tasks due today
    const todayTasks = await Task.find({
      due_date: { $gte: currentDate, $lt: tomorrow },
      isDeleted: false,
    }).exec();

    // Find tasks due between tomorrow and day after tomorrow
    const tomorrowTasks = await Task.find({
      due_date: { $gte: tomorrow, $lt: new Date(tomorrow.getTime() + 2 * 24 * 60 * 60 * 1000) },
      isDeleted: false,
    }).exec();

    // Find tasks due between the day after tomorrow and 4 days from now
    const dayAfterTomorrowTasks = await Task.find({
      due_date: {
        $gte: new Date(tomorrow.getTime() + 2 * 24 * 60 * 60 * 1000),
        $lt: new Date(tomorrow.getTime() + 4 * 24 * 60 * 60 * 1000),
      },
      isDeleted: false,
    }).exec();

    // Find tasks due between 5 days from now and onwards
    const futureTasks = await Task.find({
      due_date: { $gte: new Date(tomorrow.getTime() + 4 * 24 * 60 * 60 * 1000) },
      isDeleted: false,
    }).exec();

    // Update priority based on due_date
    overdueTasks.forEach(async (task) => {
      task.priority = -1;
      await task.save();
    });

    todayTasks.forEach(async (task) => {
      task.priority = 0;
      await task.save();
    });

    tomorrowTasks.forEach(async (task) => {
      task.priority = 1;
      await task.save();
    });

    dayAfterTomorrowTasks.forEach(async (task) => {
      task.priority = 2;
      await task.save();
    });

    futureTasks.forEach(async (task) => {
      task.priority = 3;
      await task.save();
    });

    console.log('Task priorities updated successfully');
  } catch (error) {
    console.error('Error updating task priorities:', error.message);
  }
});

const accountSid = process.env.accountSid
const authToken = process.env.authToken
const twilioClient = twilio(accountSid, authToken);

// Schedule the cron job to run every hour
cron.schedule('0 * * * *', async () => {
  try {
    const currentDate = new Date();

    // Find overdue tasks
    const overdueTasks = await Task.find({ due_date: { $lt: currentDate }, isDeleted: false }).exec();

    // Sort overdue tasks by priority
    const sortedTasks = overdueTasks.sort((a, b) => a.priority - b.priority);

    // Loop through sorted tasks and make calls
    for (const task of sortedTasks) {
      const user = await User.findById(task.user_id);
      const phoneNumber = user.phone_number;
      await twilioClient.calls.create({
        twiml: '<Response><Say>Your task is overdue. Please attend to it as soon as possible.</Say></Response>',
        to: phoneNumber,
        from: '+17205064247',
      });

      console.log(`Voice call made to user with priority ${user.priority}`);
      break;
    }
  } catch (error) {
    console.error('Error making voice calls:', error.message);
  }
});
