const express = require('express');
const router = express.Router();
const listingController = require('../controllers/listingController');

// All paths map to /api/listings/...
router.get('/', listingController.getListings);
router.post('/', listingController.createListing);
router.get('/:id', listingController.getListing);
router.put('/:id', listingController.updateListing);
router.delete('/:id', listingController.deleteListing);
router.post('/:id/sync', listingController.syncToChannel);
router.post('/bulk-sync', listingController.bulkSync);

module.exports = router;
