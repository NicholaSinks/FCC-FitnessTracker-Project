const express = require('express')
const app = express()
const cors = require('cors')
const bodyParser = require('body-parser');
require('dotenv').config()
let mongoose = require('mongoose');
let mongodb = require('mongodb');

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

const Schema = mongoose.Schema;
const userSchema = new Schema({
  username: String
});
let User = mongoose.model("user", userSchema);

const exerciseSchema = new Schema({
  username: String,
  description: String,
  duration: Number,
  date: String
})
let Exercise = mongoose.model("exercise", exerciseSchema);

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


var urlencodedParser = bodyParser.urlencoded({ extended: false });


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})

const createAndSaveUser = (newUsername) => {
  const tmpUser = new User({username: newUsername});
  tmpUser.save((err,data) => {
    if (err) return console.log(err);
  });
  return tmpUser;
}

const createAndSaveExercise = (newUsername, newDescription, newDuration, newDate) => {
  const tmpExercise = new Exercise({
    username: newUsername, 
    description: newDescription, 
    duration: newDuration,
    date: newDate
  });
  tmpExercise.save((err,data) => {
    if (err) return console.log(err);
  });
  return tmpExercise;
}

const getUserById = (id) => {
  const idToFind = new mongodb.ObjectId(id);
  return User.findOne({_id: idToFind}).exec();
} 

const getExerciseByUsername = (usernameToFind, toLimit) => {
  if (!toLimit) {
    return Exercise.find({username: usernameToFind}).sort({username: 1}).exec();
  }
  return Exercise.find({username: usernameToFind}).sort({username: 1}).limit(toLimit).exec();
}

app.post("/api/users", urlencodedParser, (req, res, next) => {
  const { username } = req.body;
  const tmpUser = createAndSaveUser(username);
  res.send({username: tmpUser.username, _id: tmpUser._id});
  next();
});

app.get("/api/users", async (req, res) => {
  const allUsers = await User.find();
  res.send(allUsers);
});

app.post("/api/users/:_id/exercises", urlencodedParser, async (req, res, next) => {
  let {date, duration, description} = req.body;
  let jsDate = new Date();
  duration=parseInt(duration);
  if (!date) {
    jsDate = new Date(Date.now());
  } else {
    jsDate = new Date(date);
  }
  const {_id} = req.params;
  const user = await getUserById(_id);
  const newExercise = createAndSaveExercise((user) ? user.username : "", description, duration, jsDate.toDateString());

  res.json({username: (user) ? user.username : "", description: newExercise.description, 
            duration: newExercise.duration, date: newExercise.date, _id: (user) ? user._id : ""});
  next();
});

app.get("/api/users/:_id/logs", urlencodedParser, async (req, res) => {
  const {_id} = req.params;
  let {from, to, limit} = req.query;
  limit = parseInt(limit);
  const fromDate = new Date(from);
  const toDate = new Date(to);
  const user = await getUserById(_id);
  const log = await getExerciseByUsername(user.username, limit);
  console.log("****", to, from);
  console.log(log, "****");
  let dateFilteredLog = [];
  if (to) {
    if (from) { // if to date and from date not null
      for (let i=0; i < log.length; i++) {
        let tmpDate = new Date(log[i].date);
        if (tmpDate.valueOf() >= fromDate.valueOf() && tmpDate.valueOf() <= toDate.valueOf()) {
          dateFilteredLog.push(log[i]);
        }
      }
    } else { // if to date not null and from date is null
      for (let i=0; i < log.length; i++) {
        let tmpDate = new Date(log[i].date);
        if (tmpDate.valueOf() <= toDate.valueOf()) {
          dateFilteredLog.push(log[i]);
        }
      }
    }
  } else if (from) { // if to date null and from date not null
    for (let i=0; i < log.length; i++) {
      let tmpDate = new Date(log[i].date);
      if (tmpDate.valueOf() >= fromDate.valueOf()) {
        dateFilteredLog.push(log[i]);
      }
    }
  } else { // if to date null and from date null
    dateFilteredLog = log;
  }
  const formattedLog = dateFilteredLog.map((item) => {
    return {description: item.description, duration: item.duration, date: item.date};
  });
  console.log(formattedLog.length, dateFilteredLog.length);
  console.log({username: user.username, count: dateFilteredLog.length, _id: user._id, log: formattedLog});
  res.json({username: user.username, count: dateFilteredLog.length, _id: user._id, log: formattedLog});
});