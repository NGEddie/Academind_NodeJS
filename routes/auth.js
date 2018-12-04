const express = require('express');
const { check, body } = require('express-validator/check');

const authController = require('../controllers/auth');
const User = require('../models/user');

const router = express.Router();

router.get('/login', authController.getLogin);

router.get('/signup', authController.getSignup);

router.post(
  '/login',
  [
    body('email', 'Invalid Email Address')
      .isEmail()
      .custom((value, { req }) => {
        ///this bit probably not necessary
        return User.findOne({ email: value }).then(user => {
          if (!user) {
            return false;
          } else {
            return true;
          }
        });
      }),
    body('password', 'Invalid Password')
      .isLength({ min: 5 })
      .isAlphanumeric()
  ],
  authController.postLogin
);

router.post(
  '/signup',
  [
    check('email')
      .isEmail()
      .withMessage('Please enter a valid email')
      .custom((value, { req }) => {
        return User.findOne({ email: value }).then(userInfo => {
          if (userInfo) {
            return Promise.reject(
              'E-Mail exists already, please choose another one'
            );
          }
        });
      }),
    body('password', 'Password needs to be greater than 5 and alphanumberic')
      .isLength({ min: 5 })
      .isAlphanumeric(),
    body('confirmPassword', 'Passwords do not match').custom(
      (value, { req }) => {
        if (value !== req.body.password) {
          return false;
        } else {
          return true;
        }
      }
    )
  ],
  authController.postSignup
);

router.post('/logout', authController.postLogout);

router.get('/resetPassword', authController.getResetPassword);

router.post('/resetPassword', authController.postResetPassword);

router.get('/reset/:token', authController.getNewPassword);

router.post('/newPassword', authController.postNewPassword);

module.exports = router;
