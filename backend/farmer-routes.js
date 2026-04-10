/**
 * Farmer Registration & Profile Routes
 * Handles all farmer-related operations
 */

import express from 'express';
import * as farmerDB from './farmer-module.js';
import { sanitizeInput, authenticateAdmin, requireRole } from './admin-middleware.js';

const router = express.Router();

// Protect farmer data and mutation endpoints behind admin authorization.
router.use(authenticateAdmin, requireRole('admin'));

/**
 * POST /api/farmers/register
 * Register a new farmer
 */
router.post('/farmers/register', sanitizeInput, async (req, res) => {
  try {
    const {
      phoneNumber,
      firstName,
      lastName,
      email,
      subCounty,
      soilType,
      farmSize,
      waterSource,
      budget,
      isGroup,
      groupName,
      groupRegistrationNumber,
      groupDescription,
      leaderFirstName,
      leaderLastName,
      leaderPhone,
      leaderEmail,
      preferredLanguage
    } = req.body;

    // Validate phone number
    if (!phoneNumber || phoneNumber.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    // Check if farmer already exists
    const existingFarmer = await farmerDB.getFarmerByPhone(req.dbAsync, phoneNumber);
    if (existingFarmer) {
      return res.status(400).json({
        success: false,
        message: 'Farmer with this phone number already exists'
      });
    }

    // Validate subCounty as well, avoid crashes
    if (!subCounty || typeof subCounty !== 'string' || subCounty.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Subcounty is required'
      });
    }

    // Register farmer
    const result = await farmerDB.registerFarmer(req.dbAsync, {
      phoneNumber,
      firstName: firstName || '',
      lastName: lastName || '',
      email: email || '',
      subCounty: subCounty || '',
      soilType: soilType || '',
      farmSize: farmSize || 0,
      waterSource: waterSource || '',
      budget: budget || 0,
      isGroup: !!isGroup,
      groupName: groupName || null,
      groupRegistrationNumber: groupRegistrationNumber || null,
      groupDescription: groupDescription || null,
      leaderFirstName: leaderFirstName || null,
      leaderLastName: leaderLastName || null,
      leaderPhone: leaderPhone || null,
      leaderEmail: leaderEmail || null,
      preferredLanguage: preferredLanguage || 'english'
    });

    res.status(201).json({
      success: true,
      message: 'Farmer registered successfully',
      data: result
    });
  } catch (error) {
    console.error('Farmer registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register farmer'
    });
  }
});

/**
 * GET /api/farmers/:farmerId
 * Get farmer profile by ID
 */
router.get('/farmers/:farmerId', async (req, res) => {
  try {
    const { farmerId } = req.params;

    if (!farmerId) {
      return res.status(400).json({
        success: false,
        message: 'Farmer ID is required'
      });
    }

    const farmer = await farmerDB.getFarmerById(req.dbAsync, farmerId);
    if (!farmer) {
      return res.status(404).json({
        success: false,
        message: 'Farmer not found'
      });
    }

    res.json({
      success: true,
      data: farmer
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get farmer'
    });
  }
});

/**
 * GET /api/farmers/phone/:phoneNumber
 * Get farmer profile by phone number
 */
router.get('/farmers/phone/:phoneNumber', async (req, res) => {
  try {
    const { phoneNumber } = req.params;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    const farmer = await farmerDB.getFarmerByPhone(req.dbAsync, phoneNumber);
    if (!farmer) {
      return res.status(404).json({
        success: false,
        message: 'Farmer not found'
      });
    }

    res.json({
      success: true,
      data: farmer
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get farmer'
    });
  }
});

/**
 * PUT /api/farmers/:farmerId
 * Update farmer profile
 */
router.put('/farmers/:farmerId', sanitizeInput, async (req, res) => {
  try {
    const { farmerId } = req.params;
    const {
      firstName,
      lastName,
      email,
      subCounty,
      soilType,
      farmSize,
      waterSource,
      budget,
      preferredLanguage
    } = req.body;

    if (!farmerId) {
      return res.status(400).json({
        success: false,
        message: 'Farmer ID is required'
      });
    }

    // Check if farmer exists
    const farmer = await farmerDB.getFarmerById(req.dbAsync, farmerId);
    if (!farmer) {
      return res.status(404).json({
        success: false,
        message: 'Farmer not found'
      });
    }

    // Update farmer profile
    await farmerDB.updateFarmerProfile(req.dbAsync, farmerId, {
      firstName,
      lastName,
      email,
      subCounty,
      soilType,
      farmSize,
      waterSource,
      budget,
      preferredLanguage
    });

    // Get updated farmer
    const updatedFarmer = await farmerDB.getFarmerById(req.dbAsync, farmerId);

    res.json({
      success: true,
      message: 'Farmer profile updated successfully',
      data: updatedFarmer
    });
  } catch (error) {
    console.error('Farmer update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update farmer profile'
    });
  }
});

/**
 * GET /api/farmers
 * Get all farmers with pagination
 */
router.get('/farmers', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const farmers = await farmerDB.getAllFarmers(req.dbAsync, limit, offset);
    const count = await farmerDB.getFarmerCount(req.dbAsync);

    res.json({
      success: true,
      data: farmers,
      pagination: {
        limit,
        offset,
        total: count,
        hasMore: offset + limit < count
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get farmers'
    });
  }
});

/**
 * GET /api/farmers/subcounty/:subCounty
 * Get farmers by sub-county
 */
router.get('/farmers/subcounty/:subCounty', async (req, res) => {
  try {
    const { subCounty } = req.params;

    const farmers = await farmerDB.getFarmersBySubCounty(req.dbAsync, subCounty);

    res.json({
      success: true,
      data: farmers,
      count: farmers.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get farmers'
    });
  }
});

/**
 * GET /api/farmers/soiltype/:soilType
 * Get farmers by soil type
 */
router.get('/farmers/soiltype/:soilType', async (req, res) => {
  try {
    const { soilType } = req.params;

    const farmers = await farmerDB.getFarmersBySoilType(req.dbAsync, soilType);

    res.json({
      success: true,
      data: farmers,
      count: farmers.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get farmers'
    });
  }
});

/**
 * GET /api/farmers/search
 * Search farmers by name or phone
 */
router.get('/farmers/search', async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Search term is required'
      });
    }

    const farmers = await farmerDB.searchFarmers(req.dbAsync, q);

    res.json({
      success: true,
      data: farmers,
      count: farmers.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to search farmers'
    });
  }
});

/**
 * GET /api/farmers/statistics
 * Get farmer statistics
 */
router.get('/farmers/statistics', async (req, res) => {
  try {
    const stats = await farmerDB.getFarmerStatistics(req.dbAsync);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get statistics'
    });
  }
});

/**
 * DELETE /api/farmers/:farmerId
 * Delete farmer profile
 */
router.delete('/farmers/:farmerId', async (req, res) => {
  try {
    const { farmerId } = req.params;

    if (!farmerId) {
      return res.status(400).json({
        success: false,
        message: 'Farmer ID is required'
      });
    }

    // Check if farmer exists
    const farmer = await farmerDB.getFarmerById(req.dbAsync, farmerId);
    if (!farmer) {
      return res.status(404).json({
        success: false,
        message: 'Farmer not found'
      });
    }

    await farmerDB.deleteFarmer(req.dbAsync, farmerId);

    res.json({
      success: true,
      message: 'Farmer profile deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete farmer'
    });
  }
});

export default router;
