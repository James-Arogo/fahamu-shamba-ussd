/**
 * Farmer Profile Dashboard Routes
 * Enhanced API endpoints for farmer registration and profile management
 */

import express from 'express';
import * as farmerProfileDB from './farmer-profile-dashboard.js';
import { sanitizeInput, authenticateAdmin, requireRole } from './admin-middleware.js';

const router = express.Router();

// Protect only farmer-profile management endpoints behind admin authorization.
// Do not gate unrelated /api routes that are handled in other routers.
router.use('/farmer-profile', authenticateAdmin, requireRole('admin'));

/**
 * POST /api/farmer-profile/register
 * Register a new farmer with complete profile
 */
router.post('/farmer-profile/register', sanitizeInput, async (req, res) => {
  try {
    const {
      phoneNumber,
      firstName,
      lastName,
      email,
      dateOfBirth,
      gender,
      idNumber,
      nationalIdType,
      subCounty,
      ward,
      soilType,
      farmSize,
      farmSizeUnit,
      waterSource,
      waterSourceType,
      cropsGrown,
      livestockKept,
      annualIncome,
      budget,
      preferredLanguage,
      contactMethod
    } = req.body;

    // Validate required fields
    if (!phoneNumber || !firstName || !lastName || !subCounty || !farmSize) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: phoneNumber, firstName, lastName, subCounty, farmSize'
      });
    }

    // Handle passport photo if provided (as base64 string)
    let passportPhotoUrl = req.body.passportPhotoUrl || null;
    let passportPhotoMimeType = req.body.passportPhotoMimeType || null;

    const result = await farmerProfileDB.registerFarmerProfile(req.dbAsync, {
      phoneNumber,
      firstName,
      lastName,
      email,
      dateOfBirth,
      gender,
      idNumber,
      nationalIdType,
      subCounty,
      ward,
      soilType,
      farmSize: parseFloat(farmSize),
      farmSizeUnit,
      waterSource,
      waterSourceType,
      cropsGrown,
      livestockKept,
      annualIncome: annualIncome ? parseFloat(annualIncome) : undefined,
      budget: budget ? parseFloat(budget) : undefined,
      preferredLanguage,
      contactMethod,
      passportPhotoUrl,
      passportPhotoMimeType
    });

    res.status(201).json({
      success: true,
      message: 'Farmer profile registered successfully',
      data: result
    });
  } catch (error) {
    console.error('Farmer profile registration error:', error);
    
    // Check if error is due to duplicate entry
    if (error.message.includes('already exists')) {
      return res.status(409).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to register farmer profile'
    });
  }
});

/**
 * GET /api/farmer-profile/:farmerId
 * Get complete farmer profile by farmer ID
 */
router.get('/farmer-profile/:farmerId', async (req, res) => {
  try {
    const { farmerId } = req.params;

    if (!farmerId) {
      return res.status(400).json({
        success: false,
        message: 'Farmer ID is required'
      });
    }

    const profile = await farmerProfileDB.getFarmerProfileById(req.dbAsync, farmerId);
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Farmer profile not found'
      });
    }

    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get farmer profile'
    });
  }
});

/**
 * GET /api/farmer-profile/phone/:phoneNumber
 * Get farmer profile by phone number
 */
router.get('/farmer-profile/phone/:phoneNumber', async (req, res) => {
  try {
    const { phoneNumber } = req.params;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    const profile = await farmerProfileDB.getFarmerProfileByPhone(req.dbAsync, phoneNumber);
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Farmer profile not found'
      });
    }

    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get farmer profile'
    });
  }
});

/**
 * PUT /api/farmer-profile/:farmerId
 * Update farmer profile
 */
router.put('/farmer-profile/:farmerId', sanitizeInput, async (req, res) => {
  try {
    const { farmerId } = req.params;

    if (!farmerId) {
      return res.status(400).json({
        success: false,
        message: 'Farmer ID is required'
      });
    }

    // Get current profile to verify it exists
    const profile = await farmerProfileDB.getFarmerProfileById(req.dbAsync, farmerId);
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Farmer profile not found'
      });
    }

    // Prepare update data
    const updateData = {};
    const allowedFields = [
      'firstName', 'lastName', 'email', 'dateOfBirth', 'gender', 'idNumber',
      'subCounty', 'ward', 'soilType', 'farmSize', 'farmSizeUnit',
      'waterSource', 'waterSourceType', 'cropsGrown', 'livestockKept',
      'annualIncome', 'budget', 'preferredLanguage', 'contactMethod',
      'passportPhotoUrl', 'passportPhotoMimeType'
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    // Check edit limit before updating (only for non-photo updates)
    if (!updateData.passportPhotoUrl) {
      const editCheck = await farmerProfileDB.canEditProfile(req.dbAsync, farmerId);
      if (!editCheck.canEdit) {
        return res.status(403).json({
          success: false,
          message: editCheck.reason,
          remainingEdits: 0,
          nextEditDate: editCheck.nextEditDate
        });
      }
    }

    // Parse numeric fields
    if (updateData.farmSize) updateData.farmSize = parseFloat(updateData.farmSize);
    if (updateData.annualIncome) updateData.annualIncome = parseFloat(updateData.annualIncome);
    if (updateData.budget) updateData.budget = parseFloat(updateData.budget);

    const result = await farmerProfileDB.updateFarmerProfile(
      req.dbAsync,
      farmerId,
      updateData,
      req.admin?.email || 'system'
    );

    // Get updated profile
    const updatedProfile = await farmerProfileDB.getFarmerProfileById(req.dbAsync, farmerId);

    res.json({
      success: true,
      message: result.message,
      data: {
        ...result,
        profile: updatedProfile
      },
      remainingEdits: result.remainingEdits
    });
  } catch (error) {
    console.error('Farmer profile update error:', error);
    
    // Check if it's an edit limit error
    if (error.message.includes('maximum of 2 profile edits')) {
      return res.status(403).json({
        success: false,
        message: error.message,
        error: 'edit_limit_exceeded'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to update farmer profile'
    });
  }
});

/**
 * GET /api/farmer-profile/:farmerId/edit-limit
 * Check if farmer can edit profile
 */
router.get('/farmer-profile/:farmerId/edit-limit', async (req, res) => {
  try {
    const { farmerId } = req.params;

    if (!farmerId) {
      return res.status(400).json({
        success: false,
        message: 'Farmer ID is required'
      });
    }

    const editCheck = await farmerProfileDB.canEditProfile(req.dbAsync, farmerId);

    res.json({
      success: true,
      canEdit: editCheck.canEdit,
      remainingEdits: editCheck.remainingEdits || 0,
      reason: editCheck.reason,
      nextEditDate: editCheck.nextEditDate
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to check edit limit'
    });
  }
});

/**
 * GET /api/farmer-profile
 * Get all farmer profiles with filters and pagination
 */
router.get('/farmer-profile', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    
    const filters = {};
    if (req.query.subCounty) filters.subCounty = req.query.subCounty;
    if (req.query.soilType) filters.soilType = req.query.soilType;
    if (req.query.searchTerm) filters.searchTerm = req.query.searchTerm;
    if (req.query.verified !== undefined) filters.verified = req.query.verified === 'true';

    const result = await farmerProfileDB.getAllFarmerProfiles(req.dbAsync, filters, limit, offset);

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get farmer profiles'
    });
  }
});

/**
 * GET /api/farmer-profile/search/:searchTerm
 * Search farmer profiles
 */
router.get('/farmer-profile/search/:searchTerm', async (req, res) => {
  try {
    const { searchTerm } = req.params;

    if (!searchTerm || searchTerm.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Search term is required'
      });
    }

    const farmers = await farmerProfileDB.searchFarmerProfiles(req.dbAsync, searchTerm);

    res.json({
      success: true,
      data: farmers,
      count: farmers.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to search farmer profiles'
    });
  }
});

/**
 * POST /api/farmer-profile/:farmerId/verify
 * Verify farmer profile
 */
router.post('/farmer-profile/:farmerId/verify', sanitizeInput, async (req, res) => {
  try {
    const { farmerId } = req.params;

    if (!farmerId) {
      return res.status(400).json({
        success: false,
        message: 'Farmer ID is required'
      });
    }

    const profile = await farmerProfileDB.getFarmerProfileById(req.dbAsync, farmerId);
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Farmer profile not found'
      });
    }

    const result = await farmerProfileDB.verifyFarmerProfile(
      req.dbAsync,
      farmerId,
      req.admin?.email || 'system'
    );

    res.json({
      success: true,
      message: result.message,
      data: {
        farmerId,
        verified: true
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to verify farmer profile'
    });
  }
});

/**
 * POST /api/farmer-profile/:farmerId/deactivate
 * Deactivate farmer profile
 */
router.post('/farmer-profile/:farmerId/deactivate', sanitizeInput, async (req, res) => {
  try {
    const { farmerId } = req.params;
    const { reason } = req.body;

    if (!farmerId) {
      return res.status(400).json({
        success: false,
        message: 'Farmer ID is required'
      });
    }

    const profile = await farmerProfileDB.getFarmerProfileById(req.dbAsync, farmerId);
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Farmer profile not found'
      });
    }

    const result = await farmerProfileDB.deactivateFarmerProfile(
      req.dbAsync,
      farmerId,
      reason,
      req.admin?.email || 'system'
    );

    res.json({
      success: true,
      message: result.message,
      data: {
        farmerId,
        active: false
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to deactivate farmer profile'
    });
  }
});

/**
 * POST /api/farmer-profile/:farmerId/reactivate
 * Reactivate farmer profile
 */
router.post('/farmer-profile/:farmerId/reactivate', sanitizeInput, async (req, res) => {
  try {
    const { farmerId } = req.params;

    if (!farmerId) {
      return res.status(400).json({
        success: false,
        message: 'Farmer ID is required'
      });
    }

    const profile = await farmerProfileDB.getFarmerProfileById(req.dbAsync, farmerId);
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Farmer profile not found'
      });
    }

    const result = await farmerProfileDB.reactivateFarmerProfile(
      req.dbAsync,
      farmerId,
      req.admin?.email || 'system'
    );

    res.json({
      success: true,
      message: result.message,
      data: {
        farmerId,
        active: true
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to reactivate farmer profile'
    });
  }
});

/**
 * GET /api/farmer-profile/statistics
 * Get farmer statistics
 */
router.get('/farmer-profile/statistics', async (req, res) => {
  try {
    const stats = await farmerProfileDB.getFarmerStatistics(req.dbAsync);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get farmer statistics'
    });
  }
});

/**
 * GET /api/farmer-profile/export
 * Export farmer data (CSV ready)
 */
router.get('/farmer-profile/export', async (req, res) => {
  try {
    const filters = {};
    if (req.query.subCounty) filters.subCounty = req.query.subCounty;
    if (req.query.soilType) filters.soilType = req.query.soilType;

    const data = await farmerProfileDB.exportFarmerData(req.dbAsync, filters);

    res.json({
      success: true,
      data,
      count: data.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to export farmer data'
    });
  }
});

export default router;
