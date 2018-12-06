// const mongodb = require('mongodb');

// const db = mongodb.MongoClient;
// let _db;

// const dbConnect = callback => {
//   db.connect(
//
//     {
//       useNewUrlParser: true
//     }
//   )
//     .then(client => {
//       console.log('Connected to MongoDB');
//       _db = client.db();
//       callback();
//     })
//     .catch(err => {
//       console.log(err);
//       throw err;
//     });
// };

// const getDb = () => {
//   if (_db) {
//     return _db;
//   }
//   throw 'No database found!';
// };

// exports.dbConnect = dbConnect;
// exports.getDb = getDb;

// ************************
// ** mySQL stuff ** //
// ************************

// const mysql = require("mysql2");

// const pool = mysql.createPool({
//   host: "localhost",
//   user: "root",
//   database: "node_shop",
//   password: "database"
// });

// module.exports = pool.promise();

// ************************
// ** Sequelize stuff ** //
// ************************

// const Sequelize = require('sequelize');

// const sequelize = new Sequelize('node_shop', 'root', 'database', {
//   dialect: 'mysql',
//   host: 'localhost',
//   operatorsAliases: false
// });

// module.exports = sequelize;
