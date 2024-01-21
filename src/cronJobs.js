const twilio =require('twilio')
const cron = require('node-cron')

const Task = require("./model/task")
const User = require("./model/user")

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
          twiml: '<Response><Say>Your task '+task.title+ ' is overdue. Please attend to it as soon as possible.</Say></Response>',
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
  