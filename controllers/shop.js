const fs = require('fs');
const path = require('path');

const PDFDocument = require('pdfkit');
const stripe = require('stripe')('sk_test_pBREDZyjyZtyIPxAQI60IO9s');

const Product = require('../models/product');
const Order = require('../models/order');

const ITEMS_PER_PAGE = 1;

exports.getProducts = (req, res, next) => {
	const page = +req.query.page || 1;

	let totalItems;

	Product.find()
		.countDocuments()
		.then((noOfProducts) => {
			totalItems = noOfProducts;
			return Product.find()
				.skip((page - 1) * ITEMS_PER_PAGE)
				.limit(ITEMS_PER_PAGE);
		})
		.then((products) => {
			res.render('shop/product-list', {
				prods       : products,
				pageTitle   : 'Products',
				path        : '/products',
				currentPage : page,
				hasNextPage : ITEMS_PER_PAGE * page < totalItems,
				hasPrevPage : page > 1,
				nextPage    : page + 1,
				prevPage    : page - 1,
				lastPage    : Math.ceil(totalItems / ITEMS_PER_PAGE)
			});
		})
		.catch((err) => {
			const error = new Error(`Unable to get products: ${err}`);
			error.httpStatusCode = 500;
			return next(error);
		});
};

exports.getProduct = (req, res, next) => {
	const prodId = req.params.productId;
	Product.findById(prodId)
		.then((product) => {
			res.render('shop/product-detail', {
				product   : product,
				pageTitle : product.title,
				path      : '/products'
			});
		})
		.catch((err) => {
			const error = new Error(`Unable to get product: ${err}`);
			error.httpStatusCode = 500;
			return next(error);
		});
};

exports.getIndex = (req, res, next) => {
	const page = +req.query.page || 1;

	let totalItems;

	Product.find()
		.countDocuments()
		.then((noOfProducts) => {
			totalItems = noOfProducts;
			return Product.find()
				.skip((page - 1) * ITEMS_PER_PAGE)
				.limit(ITEMS_PER_PAGE);
		})
		.then((products) => {
			res.render('shop/index', {
				prods       : products,
				pageTitle   : 'Shop',
				path        : '/',
				currentPage : page,
				hasNextPage : ITEMS_PER_PAGE * page < totalItems,
				hasPrevPage : page > 1,
				nextPage    : page + 1,
				prevPage    : page - 1,
				lastPage    : Math.ceil(totalItems / ITEMS_PER_PAGE)
			});
		})
		.catch((err) => {
			const error = new Error(`Unable to get products: ${err}`);
			error.httpStatusCode = 500;
			return next(error);
		});
};

exports.getCart = (req, res, next) => {
	req.user
		.populate('cart.items.productId')
		.execPopulate()
		.then((user) => {
			const products = user.cart.items;
			res.render('shop/cart', {
				path      : '/cart',
				pageTitle : 'Your Cart',
				products  : products
			});
		})
		.catch((err) => {
			const error = new Error(`Unable to retrieve cart: ${err}`);
			error.httpStatusCode = 500;
			return next(error);
		});
};

exports.postCart = (req, res, next) => {
	const prodId = req.body.productId;
	Product.findById(prodId)
		.then((product) => {
			return req.user.addToCart(product);
		})
		.then((result) => {
			res.redirect('/cart');
		});
};

exports.postCartDeleteProduct = (req, res, next) => {
	const prodId = req.body.productId;
	req.user
		.removeFromCart(prodId)
		.then((result) => {
			res.redirect('/cart');
		})
		.catch((err) => {
			const error = new Error(`Unable to delete product: ${err}`);
			error.httpStatusCode = 500;
			return next(error);
		});
};

exports.postOrder = (req, res, next) => {
	// Token is created using Checkout or Elements!
	// Get the payment token ID submitted by the form:
	const token = req.body.stripeToken; // Using Express
	let totalSum = 0;

	req.user
		.populate('cart.items.productId')
		.execPopulate()
		.then((user) => {
			user.cart.items.forEach((prod) => {
				totalSum += prod.quantity * prod.productId.price;
			});

			const products = user.cart.items.map((i) => {
				return {
					quantity : i.quantity,
					product  : { ...i.productId._doc }
				};
			});

			const order = new Order({
				user     : {
					email  : req.user.email,
					userId : req.user
				},
				products : products
			});
			return order.save();
		})
		.then((result) => {
			const charge = stripe.charges.create({
				amount      : totalSum * 100,
				currency    : 'gbp',
				description : 'Demo Order',
				source      : token,
				metadata    : { order_id: result._id.toString() }
			});
			return req.user.clearCart();
		})
		.then(() => {
			res.redirect('/orders');
		})
		.catch((err) => {
			const error = new Error(`Unable to create order: ${err}`);
			error.httpStatusCode = 500;
			return next(error);
		});
};

exports.getOrders = (req, res, next) => {
	Order.find({ 'user.userId': req.user._id })
		.then((orders) => {
			res.render('shop/orders', {
				path      : '/orders',
				pageTitle : 'Your Orders',
				orders    : orders
			});
		})
		.catch((err) => {
			const error = new Error(`Unable to retrieve orders: ${err}`);
			error.httpStatusCode = 500;
			return next(error);
		});
};

exports.getInvoice = (req, res, next) => {
	const orderId = req.params.orderId;
	const invoiceName = 'invoice-' + orderId + '.pdf';
	const invoicePath = path.join('data', 'invoices', invoiceName);

	Order.findById(orderId)
		.then((order) => {
			if (!order) {
				return next(new Error('No Order Found'));
			}
			if (order.user.userId.toString() !== req.user._id.toString()) {
				return next(new Error('Not Authorised to view invoice'));
			}

			const pdfDoc = new PDFDocument();

			res.setHeader('Content-Type', 'application/pdf');
			res.setHeader(
				'Content-Disposition',
				'inline; filename="' + invoiceName + '"'
			);

			pdfDoc.pipe(fs.createWriteStream(invoicePath));
			pdfDoc.pipe(res);

			pdfDoc.fontSize(26).text('Invoice', { underline: true });
			pdfDoc.text('-----------------------');
			let totalPrice = 0;
			order.products.forEach((product) => {
				totalPrice += product.quantity * product.product.price;
				pdfDoc
					.fontSize(14)
					.text(
						product.product.title +
							': ' +
							product.quantity +
							' x $' +
							product.product.price
					);
			});
			pdfDoc.text('----');
			pdfDoc.fontSize(20).text('Total Price: $' + totalPrice);
			pdfDoc.end();
		})
		.catch((err) => next(err));
};

// const file = fs.createReadStream(invoicePath);
// res.setHeader('Content-Type', 'application/pdf');
// res.setHeader(
//   'Content-Disposition',
//   'inline; filename="' + invoiceName + '"'
// );
// file.pipe(res);

// fs.readFile(invoicePath, (err, data) => {
// 	if (err) {
// 		return next(err);
// 	}
// 	res.setHeader('Content-Type', 'application/pdf');
// 	res.setHeader(
// 		'Content-Disposition',
// 		'attachment; filename="' + invoiceName + '"'
// 	);
// 	res.send(data);
// });

exports.getCheckout = (req, res, next) => {
	req.user
		.populate('cart.items.productId')
		.execPopulate()
		.then((user) => {
			const products = user.cart.items;
			let total = 0;
			products.forEach((prod) => {
				total += prod.quantity * prod.productId.price;
			});

			res.render('shop/checkout', {
				path      : '/checkout',
				pageTitle : 'Checkout',
				products  : products,
				totalSum  : total
			});
		})
		.catch((err) => {
			const error = new Error(`Unable to retrieve cart: ${err}`);
			error.httpStatusCode = 500;
			return next(error);
		});
};
