const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getCustomers, createCustomer, updateCustomer } = require('../controllers/customerController');

router.use(authenticate);
router.get('/', getCustomers);
router.post('/', createCustomer);
router.put('/:id', updateCustomer);

module.exports = router;
