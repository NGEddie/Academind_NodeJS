const crypto = require('crypto');

const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const sendgrid = require('nodemailer-sendgrid-transport');
const { validationResult } = require('express-validator/check');

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
    errorMessage: message,
    oldInput: {
      email: null,
      password: null
    },
    validationErrors: []
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
    errorMessage: message,
    oldInput: {
      email: null,
      password: null,
      confirmPassword: null
    },
    validationErrors: []
  });
};

exports.postLogin = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(422).render('auth/login', {
      path: '/login',
      pageTitle: 'Login',
      errorMessage: errors.array()[0].msg,
      oldInput: {
        email: email,
        password: password
      },
      validationErrors: errors.array()
    });
  }

  User.findOne({
    email: email
  })
    .then(user => {
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
            return res.status(422).render('auth/login', {
              path: '/login',
              pageTitle: 'Login',
              errorMessage: 'Invalid Login and/or Password',
              oldInput: {
                email: email,
                password: password
              },
              validationErrors: []
            });
          }
        })
        .catch(err => {
          console.log(err);
          res.redirect('/login');
        });
    })
    .catch(err => {
      const error = new Error(`User Not Found: ${err}`);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postSignup = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(422).render('auth/signup', {
      path: '/signup',
      pageTitle: 'Signup',
      errorMessage: errors.array()[0].msg,
      oldInput: {
        email: email,
        password: password,
        confirmPassword: req.body.confirmPassword
      },
      validationErrors: errors.array()
    });
  }

  bcrypt
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
    .catch(err => {
      const error = new Error(`Unable to save User: ${err}`);
      error.httpStatusCode = 500;
      return next(error);
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
          return res.redirect('/resetPassword');
        } else {
          user.resetToken = token;
          user.resetTokenExpiration = Date.now() + 3600000;
          return user.save().then(result => {
            res.redirect('/');
            transporter.sendMail({
              to: req.body.email,
              from: 'shop@node-complete.com',
              subject: 'Password Reset',
              html: `
              <p>You request a password reset</p>
              <p>Click this <a href="http://localhost:3000/reset/${token}">link</a> to set a new password.</p>`
            });
          });
        }
      })
      .catch(err => {
        const error = new Error(`Unable to find User: ${err}`);
        error.httpStatusCode = 500;
        return next(error);
      });
  });
};

exports.getNewPassword = (req, res, next) => {
  const token = req.params.token;
  let message = req.flash('error');
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }

  User.findOne({
    resetToken: token,
    resetTokenExpiration: {
      $gt: Date.now()
    }
  })
    .then(user => {
      res.render('auth/newPassword', {
        path: '/newPassword',
        pageTitle: 'New Password',
        errorMessage: message,
        userId: user._id.toString(),
        passwordToken: token
      });
    })
    .catch(err => {
      const error = new Error(`Unable to find user: ${err}`);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postNewPassword = (req, res, next) => {
  const newPassword = req.body.password;
  const userId = req.body.userId;
  const passwordToken = req.body.passwordToken;
  let foundUser;

  User.findOne({
    resetToken: passwordToken,
    resetTokenExpiration: {
      $gt: Date.now()
    },
    _id: userId
  })
    .then(user => {
      foundUser = user;
      return bcrypt.hash(newPassword, 12);
    })
    .then(hashedPassword => {
      foundUser.password = hashedPassword;
      foundUser.resetToken = undefined;
      foundUser.resetTokenExpiration = undefined;
      return foundUser.save();
    })
    .then(result => {
      res.redirect('/login');
    })
    .catch(err => {
      const error = new Error(`Unable to find user: ${err}`);
      error.httpStatusCode = 500;
      return next(error);
    });
};
