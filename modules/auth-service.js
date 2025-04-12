const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
require('dotenv').config();

const Schema = mongoose.Schema;

const userSchema = new Schema({
  userName: {
    type: String,
    unique: true
  },
  password: String,
  email: String,
  loginHistory: [{
    dateTime: Date,
    userAgent: String
  }]
});

let User; // Will be defined once initialized

module.exports.initialize = function () {
  return new Promise((resolve, reject) => {
    if (mongoose.connection.readyState === 1) {
      User = mongoose.model("users", userSchema);
      resolve();
    } else {
      mongoose.connect(process.env.MONGODB_CONN_STRING, { useNewUrlParser: true, useUnifiedTopology: true })
        .then(() => {
          User = mongoose.model("users", userSchema);
          resolve();
        })
        .catch((err) => {
          reject("Unable to connect to MongoDB: " + err);
        });
    }
  });
};

module.exports.registerUser = function (userData) {
  return new Promise(async (resolve, reject) => {
    console.log(userData)
    if (userData.password !== userData.password2) {
      reject("Passwords do not match");
      return;
    }

    try {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const newUser = new User({
        userName: userData.userName,
        password: hashedPassword,
        email: userData.email,
        loginHistory: []
      });

      await newUser.save();
      resolve();
    } catch (err) {
      if (err.code === 11000) {
        reject("User Name already taken");
      } else {
        reject("There was an error creating the user: " + err);
      }
    }
  });
};

module.exports.checkUser = function (userData) {
  return new Promise(async (resolve, reject) => {
    try {
      const user = await User.findOne({ userName: userData.userName });

      if (!user) {
        reject("Unable to find user: " + userData.userName);
        return;
      }

      const passwordMatch = await bcrypt.compare(userData.password, user.password);
      if (!passwordMatch) {
        reject("Incorrect Password for user: " + userData.userName);
        return;
      }

      user.loginHistory.push({
        dateTime: new Date(),
        userAgent: userData.userAgent
      });

      await user.save();
      resolve(user);
    } catch (err) {
      reject("There was an error verifying the user: " + err);
    }
  });
};
