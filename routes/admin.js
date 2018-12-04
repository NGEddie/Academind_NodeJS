const path = require('path');
const express = require('express');

const adminCtrl = require('../controllers/admin');
const isAuth = require('../middleware/isAuth');
const { body, check } = require('express-validator/check');

const router = express.Router();

router.get('/add-product', isAuth, adminCtrl.getAddProduct);

router.get('/products', isAuth, adminCtrl.getProducts);

router.post(
	'/add-product',
	isAuth,
	[ body('title').trim().isLength({ min: 3 }).withMessage('Product Name is too short') ],
	adminCtrl.postAddProduct
);

router.get('/edit-product/:productId', isAuth, adminCtrl.getEditProduct);

router.post('/edit-product/', isAuth, adminCtrl.postEditProduct);

router.post('/delete-product/', isAuth, adminCtrl.postDeleteProduct);

module.exports = router;
