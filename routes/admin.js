const path = require('path');
const express = require('express');

const adminCtrl = require('../controllers/admin');
const isAuth = require('../middleware/isAuth');
const { body } = require('express-validator/check');

const router = express.Router();

router.get('/add-product', isAuth, adminCtrl.getAddProduct);

router.get('/products', isAuth, adminCtrl.getProducts);

router.post(
	'/add-product',
	isAuth,
	[
		body('title')
			.trim()
			.isString()
			.withMessage('Product title should only be numbers and letters')
			.isLength({ min: 3 })
			.withMessage('Product title is too short'),
		body('price').isCurrency().withMessage('Incorrect Price format'),
		body('description')
			.trim()
			.isLength({ min: 3 })
			.withMessage('Product Description is too short')
	],
	adminCtrl.postAddProduct
);

router.get('/edit-product/:productId', adminCtrl.getEditProduct);

router.post(
	'/edit-product/',
	isAuth,
	[
		body('title')
			.trim()
			.isString()
			.withMessage('Product title should only be numbers and letters')
			.isLength({ min: 3 })
			.withMessage('Product title is too short'),
		body('price').isCurrency().withMessage('Incorrect Price format'),
		body('description')
			.trim()
			.isLength({ min: 3 })
			.withMessage('Product Description is too short')
	],
	adminCtrl.postEditProduct
);

router.post('/delete-product/', isAuth, adminCtrl.postDeleteProduct);

module.exports = router;
