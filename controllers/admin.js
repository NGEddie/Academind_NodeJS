const fileHelper = require('../util/file');

const Product = require('../models/product');

const { validationResult } = require('express-validator/check');

exports.getAddProduct = (req, res, next) => {
	if (!req.session.isAuthenticated) {
		return res.redirect('/');
	}

	// let message  = null
	res.render('admin/edit-product', {
		pageTitle        : 'Add Product',
		path             : '/admin/add-product',
		errorMessage     : null,
		editing          : false,
		hasError         : false,
		validationErrors : []
	});
};

exports.postAddProduct = (req, res, next) => {
	const id = null;
	const title = req.body.title;
	const image = req.file;
	const description = req.body.description;
	const price = req.body.price;
	const errors = validationResult(req);

	if (!image) {
		return res.status(422).render('admin/edit-product', {
			pageTitle        : 'Add Product',
			path             : '/admin/add-product',
			editing          : false,
			errorMessage     : 'Attached File should be a JPG or PNG',
			hasError         : true,
			product          : {
				title       : title,
				price       : price,
				description : description
			},
			validationErrors : errors.array()
		});
	}

	if (!errors.isEmpty()) {
		return res.status(422).render('admin/edit-product', {
			pageTitle        : 'Add Product',
			path             : '/admin/add-product',
			editing          : false,
			errorMessage     : errors.array()[0].msg,
			hasError         : true,
			product          : {
				title       : title,
				price       : price,
				description : description
			},
			validationErrors : errors.array()
		});
	}
	const imageUrl = image.path;

	const product = new Product({
		title       : title,
		imageUrl    : imageUrl,
		description : description,
		price       : price,
		userId      : req.user._id
	});

	product.save().then(() => res.redirect('/admin/products')).catch((err) => {
		const error = new Error(`Saving Product Failed: ${err}`);
		error.httpStatusCode = 500;
		return next(error);
	});
};

exports.getProducts = (req, res, next) => {
	Product.find({ userId: req.user._id })
		.then((products) => {
			res.render('admin/products', {
				pageTitle : 'Product List',
				path      : '/admin/products',
				prods     : products
			});
		})
		.catch((err) => {
			const error = new Error(`Retrieving Products Failed: ${err}`);
			error.httpStatusCode = 500;
			return next(error);
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
				pageTitle        : 'Edit Product',
				path             : '/admin/edit-product',
				editing          : editMode,
				product          : product,
				errorMessage     : null,
				hasError         : false,
				validationErrors : []
			});
		})
		.catch((err) => {
			const error = new Error(`Unable to retrieve product: ${err}`);
			error.httpStatusCode = 500;
			return next(error);
		});
};

exports.postEditProduct = (req, res, next) => {
	const prodId = req.body.productId;
	const updatedTitle = req.body.title;
	const image = req.file;
	const updatedPrice = req.body.price;
	const updatedDescription = req.body.description;
	const errors = validationResult(req);

	if (!errors.isEmpty()) {
		return res.status(422).render('admin/edit-product', {
			pageTitle        : 'Edit Product',
			path             : '/admin/edit-product',
			editing          : true,
			product          : {
				_id         : prodId,
				title       : updatedTitle,
				price       : updatedPrice,
				description : updatedDescription
			},
			hasError         : true,
			errorMessage     : errors.array()[0].msg,
			validationErrors : errors.array()
		});
	}

	Product.findById(prodId)
		.then((product) => {
			if (product.userId.toString() != req.user._id.toString()) {
				return res.redirect('/');
			} else {
				product.title = updatedTitle;
				product.price = updatedPrice;
				product.description = updatedDescription;

				if (image) {
					fileHelper.deleteFile(product.imageUrl);
					product.imageUrl = image.path;
				}

				return product
					.save()
					.then(() => res.redirect('/admin/products'));
			}
		})
		.catch((err) => {
			const error = new Error(`Unable to find Product: ${err}`);
			error.httpStatusCode = 500;
			return next(error);
		});
};

// exports.postDeleteProduct = (req, res, next) => {
// 	const prodId = req.body.productId;
// 	Product.findById(prodId)
// 		.then((product) => {
// 			if (!product) {
// 				return next(new Error('Product Not Found'));
// 			}
// 			fileHelper.deleteFile(product.imageUrl);
// 			return Product.deleteOne({ _id: prodId, userId: req.user._id });
// 		})
// 		.then(() => res.redirect('/admin/products'))
// 		.catch((err) => {
// 			const error = new Error(`Unable to delete Product: ${err}`);
// 			error.httpStatusCode = 500;
// 			return next(error);
// 		});
// };

exports.deleteProduct = (req, res, next) => {
	const prodId = req.params.productId;
	Product.findById(prodId)
		.then((product) => {
			if (!product) {
				return next(new Error('Product Not Found'));
			}
			fileHelper.deleteFile(product.imageUrl);
			return Product.deleteOne({ _id: prodId, userId: req.user._id });
		})
		.then(() => res.status(200).json({ message: 'Success' }))
		.catch((err) => {
			res.status(500).json({ message: 'Product Delete Failed' });
		});
};
