const Product = require('../models/product');
const { validationResult } = require('express-validator/check');

exports.getAddProduct = (req, res, next) => {
	if (!req.session.isAuthenticated) {
		return res.redirect('/');
	}

	// let message  = null
	res.render('admin/edit-product', {
		pageTitle: 'Add Product',
		path: '/admin/add-product',
		errorMessage: null,
		editing: false,
		isAuthenticated: req.session.isAuthenticated,
		oldInput: { title: null },
		validationErrors: []
	});
};

exports.postAddProduct = (req, res, next) => {
	const id = null;
	const title = req.body.title;
	const imageUrl = req.body.imageUrl;
	const description = req.body.description;
	const price = req.body.price;

	const errors = validationResult(req);
	console.log(errors.array());

	if (!errors.isEmpty()) {
		return res.status(422).render('admin/edit-product', {
			pageTitle: 'Add Product',
			path: '/admin/add-product',
			editing: false,
			errorMessage: errors.array()[0].msg,
			isAuthenticated: req.session.isAuthenticated,
			oldInput: { title: title },
			validationErrors: errors.array()
		});
	}

	const product = new Product({
		title: title,
		imageUrl: imageUrl,
		description: description,
		price: price,
		userId: req.user._id
	});

	product.save().then(() => res.redirect('/admin/products')).catch((err) => console.log(err));
};

exports.getProducts = (req, res, next) => {
	Product.find({ userId: req.user._id })
		.then((products) => {
			res.render('admin/products', {
				pageTitle: 'Product List',
				path: '/admin/products',
				prods: products
			});
		})
		.catch((err) => {
			console.log(err);
		});
};

exports.getEditProduct = (req, res, next) => {
	const editMode = req.query.edit;

	if (!editMode) {
		res.redirect('/');
	}
	const prodId = req.params.productId;

	Product.findById(prodId)
		.then((product) => {
			if (!product) {
				return res.redirect('/');
			}
			res.render('admin/edit-product', {
				pageTitle: 'Edit Product',
				path: '/admin/edit-product',
				editing: editMode,
				product: product
			});
		})
		.catch((err) => console.log(err));
};

exports.postEditProduct = (req, res, next) => {
	const prodId = req.body.productId;
	const updatedTitle = req.body.title;
	const updatedImageUrl = req.body.imageUrl;
	const updatedPrice = req.body.price;
	const updatedDescription = req.body.description;

	Product.findById(prodId)
		.then((product) => {
			if (product.userId.toString() != req.user._id.toString()) {
				return res.redirect('/');
			} else {
				product.title = updatedTitle;
				product.imageUrl = updatedImageUrl;
				product.price = updatedPrice;
				product.description = updatedDescription;

				return product.save().then(() => res.redirect('/admin/products'));
			}
		})
		.catch((err) => console.log(err));
};

exports.postDeleteProduct = (req, res, next) => {
	const prodId = req.body.productId;
	Product.deleteOne({ _id: prodId, userId: req.user._id })
		.then(() => res.redirect('/admin/products'))
		.catch((err) => console.log(err));
};
