const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
let Schema = mongoose.Schema;
require('dotenv').config(); 

  const userSchema = new Schema ({
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
  
let User; 

function initialize()
 {
  return new Promise(function (resolve, reject) {
    let db = mongoose.createConnection(process.env.MONGODB_CONN_STRING);

    db.on('error', (err) => {
      reject(err); // reject the promise with the provided error
    });

    db.once('open', () => {
      User = db.model('users', userSchema);
      resolve(); // resolve the promise once connection is open
    });
  });
}

const saveUserToDb = (userData) => 
{
  return User.create(userData);
};


const registerUser = (userData) => {
  return new Promise((resolve, reject) => {
    bcrypt.hash(userData.password, 10)
      .then((hash) => {
        userData.password = hash;

        saveUserToDb(userData)
          .then((user) => {
            resolve(user);
          })
          .catch((err) => {
            reject('There was an error saving the user to the database: ' + err);
          });
      })
      .catch((err) => {
        reject('There was an error encrypting the password: ' + err);
      });
  });
};

const getUserFromDb = async (userName) =>
{
  return await User.findOne({ userName: userName });
};


const checkUser = (userData) => {
  return new Promise((resolve, reject) => {
    // Find the user from the database (assuming you have a function for this)
    getUserFromDb(userData.userName)
      .then((user) => {
        if (!user) {
          return reject('User not found');
        }

        // Use bcrypt to compare the entered password with the hashed password in the database
        bcrypt.compare(userData.password, user.password)
          .then((result) => {
            if (result) {
              // Password matches
              resolve(user);
            } else {
              // Incorrect password
              reject('Incorrect password for user: ' + userData.userName);
            }
          })
          .catch((err) => {
            reject('Error comparing passwords: ' + err);
          });
      })
      .catch((err) => {
        reject('Error retrieving user from the database: ' + err);
      });
  });
};


module.exports = {initialize, registerUser, checkUser};

