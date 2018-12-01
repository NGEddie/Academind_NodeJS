const express = require('express');

const authController = require('../controllers/auth');

const router = express.Router();

router.get('/login', authController.getLogin);

router.get('/signup', authController.getSignup);

router.post('/login', authController.postLogin);

router.post('/signup', authController.postSignup);

router.post('/logout', authController.postLogout);

router.get('/resetPassword', authController.getResetPassword)

router.post('/resetPassword', authController.postResetPassword)

router.get('/reset/:token', authController.getNewPassword)

router.post('/newPassword', authController.postNewPassword)

module.exports = router;