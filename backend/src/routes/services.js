const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getServices, createService, updateService, deleteService } = require('../controllers/serviceController');

router.use(authenticate);
router.get('/', getServices);
router.post('/', createService);
router.put('/:id', updateService);
router.delete('/:id', deleteService);

module.exports = router;
