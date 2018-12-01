const crypto = require('crypto');

const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const sendgrid = require('nodemailer-sendgrid-transport');

const User = require('../models/user');

const transporter = nodemailer.createTransport(
  sendgrid({
    auth: {
      api_key: process.env.SENDGRID_API
    }
  })
);

exports.getLogin = (req, res, next) => {
  let message = req.flash('error');
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  res.render('auth/login', {
    path: '/login',
    pageTitle: 'Login',
    errorMessage: message
  });
};

exports.getSignup = (req, res, next) => {
  let message = req.flash('emailExists');

  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }

  res.render('auth/signup', {
    path: '/signup',
    pageTitle: 'Signup',
    isAuthenticated: false,
    errorMessage: message
  });
};

exports.postLogin = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;

  User.findOne({
    email: email
  })
    .then(user => {
      if (!user) {
        req.flash('error', 'Invalid email or Password');
        return res.redirect('/login');
      } else {
        bcrypt
          .compare(password, user.password)
          .then(isAMatch => {
            if (isAMatch) {
              req.session.isAuthenticated = true;
              req.session.user = user;
              return req.session.save(err => {
                return res.redirect('/');
              });
            } else {
              req.flash('error', 'Invalid email or Password');
              return res.redirect('/login');
            }
          })
          .catch(err => {
            console.log(err);
            res.redirect('/login');
          });
      }
    })
    .catch(err => console.log(err));
};

exports.postSignup = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  const confirmPassword = req.body.password;

  User.findOne({
    email: email
  })
    .then(userInfo => {
      if (userInfo) {
        req.flash('emailExists', `${email} already exists`);
        return res.redirect('/signup');
      } else {
        return bcrypt
          .hash(password, 12)
          .then(hashedPassword => {
            const user = new User({
              email: email,
              password: hashedPassword,
              cart: {
                items: []
              }
            });
            return user.save();
          })
          .then(result => {
            res.redirect('/login');
            return transporter.sendMail({
              to: email,
              from: 'shop@node-complete.com',
              subject: 'Sign Up Suceeded',
              html: '<h1>Woohoo successfully signed up!</h1>'
            });
          })
          .catch(err => console.log(err));
      }
    })
    .catch(err => {
      console.log(err);
    });
};

exports.postLogout = (req, res, next) => {
  req.session.destroy(err => {
    res.redirect('/');
  });
};

exports.getResetPassword = (req, res, next) => {
  let message = req.flash('error');
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }

  res.render('auth/resetPassword', {
    path: '/resetPW',
    pageTitle: 'Reset Password',
    errorMessage: message
  });
};

exports.postResetPassword = (req, res, next) => {
  crypto.randomBytes(32, (err, buffer) => {
    if (err) {
      console.log(err);
      return res.redirect('/resetPassword');
    }
    const token = buffer.toString('hex');

    User.findOne({
      email: req.body.email
    })
      .then(user => {
        if (!user) {
          req.flash('error', 'Email address not valid');
          return res.redirect('/reset');
        } else {
          user.resetToken = token;
          user.resetTokenExpiration = Date.now() + 3600000;
          return user.save();
        }
      })
      .then(result => {
        res.redirect('/');
        transporter.sendMail({
          to: req.body.email,
          from: 'shop@node-complete.com',
          subject: 'Password Reset',
          html: `
          <p>You request a password reset</p>
          <p>Click this <a href="http://localhost:3000/reset/${token}>link</a> to set a new password.</p>`
        });
      })
      .catch(err => console.log(err));
  });
};
