/**
 * Farmer Profile Dashboard Module
 * Enhanced module for farmer registration and profile management on the dashboard
 * Includes profile validation, data enrichment, and advanced querying
 */

/**
 * Enhanced Farmer Database Schema
 */
export function initializeEnhancedFarmerDatabase(db) {
  try {
    // Main farmers profile table
    db.exec(`CREATE TABLE IF NOT EXISTS farmer_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      farmer_id TEXT UNIQUE NOT NULL,
      phone_number TEXT UNIQUE NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT,
      date_of_birth DATE,
      gender TEXT CHECK(gender IN ('male', 'female', 'other')),
      id_number TEXT,
      national_id_type TEXT DEFAULT 'national_id',
      sub_county TEXT NOT NULL,
      ward TEXT,
      soil_type TEXT,
      farm_size REAL,
      farm_size_unit TEXT DEFAULT 'acres',
      water_source TEXT,
      water_source_type TEXT,
      crops_grown TEXT,
      livestock_kept TEXT,
      annual_income REAL,
      budget REAL,
      preferred_language TEXT DEFAULT 'english' CHECK(preferred_language IN ('english', 'swahili', 'luo')),
      contact_method TEXT DEFAULT 'sms' CHECK(contact_method IN ('sms', 'call', 'email')),
      passport_photo_data LONGBLOB,
      passport_photo_url TEXT,
      passport_photo_mime_type TEXT,
      photo_uploaded_date DATETIME,
      profile_completion_percentage INTEGER DEFAULT 0,
      profile_verified BOOLEAN DEFAULT 0,
      verified_by TEXT,
      verified_at DATETIME,
      is_active BOOLEAN DEFAULT 1,
      last_updated_by TEXT,
      last_login DATETIME,
      login_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    console.log('✅ Enhanced farmer_profiles table ready');

    // Farmer activity log
    db.exec(`CREATE TABLE IF NOT EXISTS farmer_activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      farmer_id TEXT NOT NULL,
      activity_type TEXT NOT NULL,
      description TEXT,
      metadata TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(farmer_id) REFERENCES farmer_profiles(farmer_id) ON DELETE CASCADE
    )`);
    console.log('✅ farmer_activity_logs table ready');

    // Farmer farm details table
    db.exec(`CREATE TABLE IF NOT EXISTS farmer_farms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      farmer_id TEXT NOT NULL,
      farm_name TEXT,
      farm_location TEXT,
      farm_size REAL,
      farm_size_unit TEXT DEFAULT 'acres',
      soil_type TEXT,
      water_source TEXT,
      terrain_type TEXT,
      registration_number TEXT,
      is_primary BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(farmer_id) REFERENCES farmer_profiles(farmer_id) ON DELETE CASCADE
    )`);
    console.log('✅ farmer_farms table ready');

    // Create indexes for performance
    db.exec(`CREATE INDEX IF NOT EXISTS idx_farmer_profiles_phone ON farmer_profiles(phone_number)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_farmer_profiles_email ON farmer_profiles(email)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_farmer_profiles_subcounty ON farmer_profiles(sub_county)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_farmer_profiles_active ON farmer_profiles(is_active)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_farmer_profiles_farmer_id ON farmer_profiles(farmer_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_farmer_activity_logs_farmer ON farmer_activity_logs(farmer_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_farmer_farms_farmer ON farmer_farms(farmer_id)`);
    
    console.log('✅ All farmer_profiles indexes created');
  } catch (err) {
    console.error('Error initializing enhanced farmer database:', err.message);
  }
}

/**
 * Generate unique farmer ID
 */
function generateFarmerId() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `FR-${timestamp}-${random}`.toUpperCase();
}

/**
 * Calculate profile completion percentage
 */
function calculateProfileCompletion(profileData) {
  const requiredFields = [
    'firstName', 'lastName', 'email', 'subCounty', 'farmSize'
  ];
  
  const optionalFields = [
    'dateOfBirth', 'gender', 'idNumber', 'ward', 'soilType', 
    'waterSource', 'cropsGrown', 'livestockKept', 'annualIncome', 'budget'
  ];

  let completedRequired = 0;
  requiredFields.forEach(field => {
    if (profileData[field] && profileData[field].toString().trim() !== '') {
      completedRequired++;
    }
  });

  let completedOptional = 0;
  optionalFields.forEach(field => {
    if (profileData[field] && profileData[field].toString().trim() !== '') {
      completedOptional++;
    }
  });

  const requiredPercentage = (completedRequired / requiredFields.length) * 60;
  const optionalPercentage = (completedOptional / optionalFields.length) * 40;
  
  return Math.round(requiredPercentage + optionalPercentage);
}

/**
 * Register a new farmer with full profile
 */
export async function registerFarmerProfile(dbAsync, farmerData) {
  try {
    const {
      phoneNumber,
      firstName,
      lastName,
      email,
      dateOfBirth,
      gender,
      idNumber,
      nationalIdType = 'national_id',
      subCounty,
      ward,
      soilType,
      farmSize,
      farmSizeUnit = 'acres',
      waterSource,
      waterSourceType,
      cropsGrown,
      livestockKept,
      annualIncome,
      budget,
      preferredLanguage = 'english',
      contactMethod = 'sms',
      passportPhotoUrl,
      passportPhotoMimeType
    } = farmerData;

    // Validation
    if (!phoneNumber || !firstName || !lastName || !subCounty || !farmSize) {
      throw new Error('Missing required fields: phoneNumber, firstName, lastName, subCounty, farmSize');
    }

    // Check if farmer already exists
    const existingFarmer = await dbAsync.get(
      `SELECT farmer_id FROM farmer_profiles WHERE phone_number = ? OR email = ?`,
      [phoneNumber, email]
    );
    
    if (existingFarmer) {
      throw new Error('Farmer with this phone number or email already exists');
    }

    const farmerId = generateFarmerId();
    const profileData = {
      firstName, lastName, email, dateOfBirth, gender, idNumber,
      subCounty, ward, soilType, farmSize, waterSource, 
      cropsGrown, livestockKept, annualIncome, budget
    };
    const completionPercentage = calculateProfileCompletion(profileData);

    const photoUploadedDate = passportPhotoUrl ? new Date().toISOString() : null;

    const result = await dbAsync.run(
      `INSERT INTO farmer_profiles (
        farmer_id, phone_number, first_name, last_name, email, date_of_birth,
        gender, id_number, national_id_type, sub_county, ward, soil_type,
        farm_size, farm_size_unit, water_source, water_source_type,
        crops_grown, livestock_kept, annual_income, budget,
        preferred_language, contact_method, passport_photo_url, passport_photo_mime_type,
        photo_uploaded_date, profile_completion_percentage
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        farmerId, phoneNumber, firstName, lastName, email, dateOfBirth,
        gender, idNumber, nationalIdType, subCounty, ward, soilType,
        farmSize, farmSizeUnit, waterSource, waterSourceType,
        cropsGrown, livestockKept, annualIncome, budget,
        preferredLanguage, contactMethod, passportPhotoUrl, passportPhotoMimeType,
        photoUploadedDate, completionPercentage
      ]
    );

    // Log activity
    await logFarmerActivity(dbAsync, farmerId, 'PROFILE_CREATED', 'Farmer profile registered');

    return {
      farmerId,
      phoneNumber,
      firstName,
      lastName,
      profileCompletion: completionPercentage,
      passportPhotoUrl,
      message: 'Farmer profile registered successfully'
    };
  } catch (error) {
    throw new Error(`Failed to register farmer profile: ${error.message}`);
  }
}

/**
 * Get farmer profile by phone number
 */
export async function getFarmerProfileByPhone(dbAsync, phoneNumber) {
  try {
    return await dbAsync.get(
      `SELECT * FROM farmer_profiles WHERE phone_number = ? AND is_active = 1`,
      [phoneNumber]
    );
  } catch (error) {
    throw new Error(`Failed to get farmer profile: ${error.message}`);
  }
}

/**
 * Get farmer profile by farmer ID
 */
export async function getFarmerProfileById(dbAsync, farmerId) {
  try {
    const profile = await dbAsync.get(
      `SELECT * FROM farmer_profiles WHERE farmer_id = ? AND is_active = 1`,
      [farmerId]
    );

    if (!profile) return null;

    // Get associated farms
    const farms = await dbAsync.all(
      `SELECT * FROM farmer_farms WHERE farmer_id = ?`,
      [farmerId]
    );

    // Get recent activity
    const recentActivity = await dbAsync.all(
      `SELECT * FROM farmer_activity_logs WHERE farmer_id = ? ORDER BY created_at DESC LIMIT 10`,
      [farmerId]
    );

    return {
      ...profile,
      farms,
      recentActivity
    };
  } catch (error) {
    throw new Error(`Failed to get farmer profile: ${error.message}`);
  }
}

/**
 * Update farmer profile
 */
export async function updateFarmerProfile(dbAsync, farmerId, profileData, updatedBy) {
  try {
    const {
      firstName,
      lastName,
      email,
      dateOfBirth,
      gender,
      idNumber,
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
    } = profileData;

    // Get current profile for completion calculation
    const currentProfile = await dbAsync.get(
      `SELECT * FROM farmer_profiles WHERE farmer_id = ?`,
      [farmerId]
    );

    if (!currentProfile) {
      throw new Error('Farmer not found');
    }

    // Merge and calculate new completion
    const mergedData = { ...currentProfile, ...profileData };
    const completionPercentage = calculateProfileCompletion(mergedData);

    const updates = [];
    const values = [];

    if (firstName !== undefined) {
      updates.push('first_name = ?');
      values.push(firstName);
    }
    if (lastName !== undefined) {
      updates.push('last_name = ?');
      values.push(lastName);
    }
    if (email !== undefined) {
      updates.push('email = ?');
      values.push(email);
    }
    if (dateOfBirth !== undefined) {
      updates.push('date_of_birth = ?');
      values.push(dateOfBirth);
    }
    if (gender !== undefined) {
      updates.push('gender = ?');
      values.push(gender);
    }
    if (idNumber !== undefined) {
      updates.push('id_number = ?');
      values.push(idNumber);
    }
    if (subCounty !== undefined) {
      updates.push('sub_county = ?');
      values.push(subCounty);
    }
    if (ward !== undefined) {
      updates.push('ward = ?');
      values.push(ward);
    }
    if (soilType !== undefined) {
      updates.push('soil_type = ?');
      values.push(soilType);
    }
    if (farmSize !== undefined) {
      updates.push('farm_size = ?');
      values.push(farmSize);
    }
    if (farmSizeUnit !== undefined) {
      updates.push('farm_size_unit = ?');
      values.push(farmSizeUnit);
    }
    if (waterSource !== undefined) {
      updates.push('water_source = ?');
      values.push(waterSource);
    }
    if (waterSourceType !== undefined) {
      updates.push('water_source_type = ?');
      values.push(waterSourceType);
    }
    if (cropsGrown !== undefined) {
      updates.push('crops_grown = ?');
      values.push(cropsGrown);
    }
    if (livestockKept !== undefined) {
      updates.push('livestock_kept = ?');
      values.push(livestockKept);
    }
    if (annualIncome !== undefined) {
      updates.push('annual_income = ?');
      values.push(annualIncome);
    }
    if (budget !== undefined) {
      updates.push('budget = ?');
      values.push(budget);
    }
    if (preferredLanguage !== undefined) {
      updates.push('preferred_language = ?');
      values.push(preferredLanguage);
    }
    if (contactMethod !== undefined) {
      updates.push('contact_method = ?');
      values.push(contactMethod);
    }

    if (updates.length === 0) {
      throw new Error('No fields to update');
    }

    updates.push('profile_completion_percentage = ?');
    values.push(completionPercentage);

    updates.push('last_updated_by = ?');
    values.push(updatedBy);

    updates.push('updated_at = CURRENT_TIMESTAMP');

    values.push(farmerId);

    const sql = `UPDATE farmer_profiles SET ${updates.join(', ')} WHERE farmer_id = ?`;
    await dbAsync.run(sql, values);

    // Log activity
    await logFarmerActivity(dbAsync, farmerId, 'PROFILE_UPDATED', 'Farmer profile updated', { updatedBy });

    return {
      farmerId,
      message: 'Farmer profile updated successfully',
      profileCompletion: completionPercentage
    };
  } catch (error) {
    throw new Error(`Failed to update farmer profile: ${error.message}`);
  }
}

/**
 * Get all farmer profiles with pagination and filters
 */
export async function getAllFarmerProfiles(dbAsync, filters = {}, limit = 50, offset = 0) {
  try {
    let query = `SELECT * FROM farmer_profiles WHERE is_active = 1`;
    const params = [];

    if (filters.subCounty) {
      query += ` AND sub_county = ?`;
      params.push(filters.subCounty);
    }

    if (filters.soilType) {
      query += ` AND soil_type = ?`;
      params.push(filters.soilType);
    }

    if (filters.searchTerm) {
      query += ` AND (first_name LIKE ? OR last_name LIKE ? OR phone_number LIKE ? OR email LIKE ?)`;
      const searchTerm = `%${filters.searchTerm}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (filters.verified !== undefined) {
      query += ` AND profile_verified = ?`;
      params.push(filters.verified ? 1 : 0);
    }

    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as count');
    const countResult = await dbAsync.get(countQuery, params);

    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const profiles = await dbAsync.all(query, params);

    return {
      data: profiles,
      pagination: {
        limit,
        offset,
        total: countResult.count,
        hasMore: offset + limit < countResult.count
      }
    };
  } catch (error) {
    throw new Error(`Failed to get farmer profiles: ${error.message}`);
  }
}

/**
 * Verify farmer profile
 */
export async function verifyFarmerProfile(dbAsync, farmerId, verifiedBy) {
  try {
    await dbAsync.run(
      `UPDATE farmer_profiles 
       SET profile_verified = 1, verified_by = ?, verified_at = CURRENT_TIMESTAMP
       WHERE farmer_id = ?`,
      [verifiedBy, farmerId]
    );

    await logFarmerActivity(dbAsync, farmerId, 'PROFILE_VERIFIED', 'Farmer profile verified', { verifiedBy });

    return { message: 'Farmer profile verified successfully' };
  } catch (error) {
    throw new Error(`Failed to verify farmer profile: ${error.message}`);
  }
}

/**
 * Deactivate farmer profile
 */
export async function deactivateFarmerProfile(dbAsync, farmerId, reason, deactivatedBy) {
  try {
    await dbAsync.run(
      `UPDATE farmer_profiles 
       SET is_active = 0, last_updated_by = ?
       WHERE farmer_id = ?`,
      [deactivatedBy, farmerId]
    );

    await logFarmerActivity(dbAsync, farmerId, 'PROFILE_DEACTIVATED', reason || 'Profile deactivated', { deactivatedBy });

    return { message: 'Farmer profile deactivated successfully' };
  } catch (error) {
    throw new Error(`Failed to deactivate farmer profile: ${error.message}`);
  }
}

/**
 * Reactivate farmer profile
 */
export async function reactivateFarmerProfile(dbAsync, farmerId, reactivatedBy) {
  try {
    await dbAsync.run(
      `UPDATE farmer_profiles 
       SET is_active = 1, last_updated_by = ?
       WHERE farmer_id = ?`,
      [reactivatedBy, farmerId]
    );

    await logFarmerActivity(dbAsync, farmerId, 'PROFILE_REACTIVATED', 'Profile reactivated', { reactivatedBy });

    return { message: 'Farmer profile reactivated successfully' };
  } catch (error) {
    throw new Error(`Failed to reactivate farmer profile: ${error.message}`);
  }
}

/**
 * Log farmer activity
 */
async function logFarmerActivity(dbAsync, farmerId, activityType, description, metadata = {}) {
  try {
    await dbAsync.run(
      `INSERT INTO farmer_activity_logs (farmer_id, activity_type, description, metadata)
       VALUES (?, ?, ?, ?)`,
      [farmerId, activityType, description, JSON.stringify(metadata)]
    );
  } catch (error) {
    console.error('Failed to log farmer activity:', error);
  }
}

/**
 * Get farmer statistics
 */
export async function getFarmerStatistics(dbAsync) {
  try {
    const totalFarmers = await dbAsync.get(
      `SELECT COUNT(*) as count FROM farmer_profiles WHERE is_active = 1`
    );

    const verifiedFarmers = await dbAsync.get(
      `SELECT COUNT(*) as count FROM farmer_profiles WHERE profile_verified = 1 AND is_active = 1`
    );

    const farmersBySubCounty = await dbAsync.all(
      `SELECT sub_county, COUNT(*) as count FROM farmer_profiles 
       WHERE is_active = 1 GROUP BY sub_county ORDER BY count DESC LIMIT 10`
    );

    const farmersBySoilType = await dbAsync.all(
      `SELECT soil_type, COUNT(*) as count FROM farmer_profiles 
       WHERE is_active = 1 AND soil_type IS NOT NULL GROUP BY soil_type ORDER BY count DESC`
    );

    const avgFarmSize = await dbAsync.get(
      `SELECT AVG(farm_size) as average, MIN(farm_size) as min, MAX(farm_size) as max 
       FROM farmer_profiles WHERE farm_size > 0 AND is_active = 1`
    );

    const avgBudget = await dbAsync.get(
      `SELECT AVG(budget) as average, MIN(budget) as min, MAX(budget) as max 
       FROM farmer_profiles WHERE budget > 0 AND is_active = 1`
    );

    const profileCompletionStats = await dbAsync.get(
      `SELECT AVG(profile_completion_percentage) as avg_completion FROM farmer_profiles WHERE is_active = 1`
    );

    return {
      totalFarmers: totalFarmers.count,
      verifiedFarmers: verifiedFarmers.count,
      verificationRate: totalFarmers.count > 0 ? Math.round((verifiedFarmers.count / totalFarmers.count) * 100) : 0,
      farmersBySubCounty,
      farmersBySoilType,
      farmSizeStats: {
        average: avgFarmSize.average || 0,
        min: avgFarmSize.min || 0,
        max: avgFarmSize.max || 0
      },
      budgetStats: {
        average: avgBudget.average || 0,
        min: avgBudget.min || 0,
        max: avgBudget.max || 0
      },
      profileCompletionStats: {
        average: Math.round(profileCompletionStats.avg_completion) || 0
      }
    };
  } catch (error) {
    throw new Error(`Failed to get farmer statistics: ${error.message}`);
  }
}

/**
 * Search farmers
 */
export async function searchFarmerProfiles(dbAsync, searchTerm) {
  try {
    return await dbAsync.all(
      `SELECT * FROM farmer_profiles 
       WHERE is_active = 1 AND (
         first_name LIKE ? OR 
         last_name LIKE ? OR 
         phone_number LIKE ? OR 
         email LIKE ? OR 
         farmer_id LIKE ?
       ) ORDER BY created_at DESC LIMIT 50`,
      [
        `%${searchTerm}%`,
        `%${searchTerm}%`,
        `%${searchTerm}%`,
        `%${searchTerm}%`,
        `%${searchTerm}%`
      ]
    );
  } catch (error) {
    throw new Error(`Failed to search farmer profiles: ${error.message}`);
  }
}

/**
 * Export farmer data
 */
export async function exportFarmerData(dbAsync, filters = {}) {
  try {
    const profiles = await getAllFarmerProfiles(dbAsync, filters, 10000, 0);
    return profiles.data;
  } catch (error) {
    throw new Error(`Failed to export farmer data: ${error.message}`);
  }
}
