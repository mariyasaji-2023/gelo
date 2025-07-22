// backend/src/utils/distance.js

/**
 * Calculate distance between two geographic coordinates using Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} Distance in meters
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth's radius in meters
  
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
}

/**
 * Convert degrees to radians
 * @param {number} degrees 
 * @returns {number} Radians
 */
function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Convert radians to degrees
 * @param {number} radians 
 * @returns {number} Degrees
 */
function toDegrees(radians) {
  return radians * (180 / Math.PI);
}

/**
 * Calculate bearing between two points
 * @param {number} lat1 - Starting latitude
 * @param {number} lon1 - Starting longitude
 * @param {number} lat2 - Destination latitude
 * @param {number} lon2 - Destination longitude
 * @returns {number} Bearing in degrees (0-360)
 */
function calculateBearing(lat1, lon1, lat2, lon2) {
  const dLon = toRadians(lon2 - lon1);
  const lat1Rad = toRadians(lat1);
  const lat2Rad = toRadians(lat2);
  
  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - 
            Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
  
  const bearing = toDegrees(Math.atan2(y, x));
  
  // Normalize to 0-360 degrees
  return (bearing + 360) % 360;
}

/**
 * Find users within a specific radius
 * @param {Array} users - Array of user objects with location data
 * @param {number} centerLat - Center latitude
 * @param {number} centerLon - Center longitude
 * @param {number} radius - Radius in meters
 * @returns {Array} Users within radius with distance information
 */
function findUsersInRadius(users, centerLat, centerLon, radius = 50) {
  return users
    .map(user => {
      if (!user.location || !user.location.latitude || !user.location.longitude) {
        return null;
      }
      
      const distance = calculateDistance(
        centerLat, centerLon,
        user.location.latitude, user.location.longitude
      );
      
      return {
        ...user,
        distance: Math.round(distance * 100) / 100, // Round to 2 decimal places
        bearing: calculateBearing(
          centerLat, centerLon,
          user.location.latitude, user.location.longitude
        )
      };
    })
    .filter(user => user !== null && user.distance <= radius)
    .sort((a, b) => a.distance - b.distance);
}

/**
 * Validate coordinates
 * @param {number} latitude 
 * @param {number} longitude 
 * @returns {boolean} True if coordinates are valid
 */
function validateCoordinates(latitude, longitude) {
  return (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    latitude >= -90 && latitude <= 90 &&
    longitude >= -180 && longitude <= 180 &&
    !isNaN(latitude) && !isNaN(longitude)
  );
}

/**
 * Generate random coordinates within a radius of a center point
 * @param {number} centerLat - Center latitude
 * @param {number} centerLon - Center longitude
 * @param {number} radiusInMeters - Radius in meters
 * @returns {Object} Random coordinates {latitude, longitude}
 */
function generateRandomCoordinatesInRadius(centerLat, centerLon, radiusInMeters = 100) {
  // Convert radius from meters to degrees (approximate)
  const radiusInDegrees = radiusInMeters / 111000; // 1 degree ≈ 111km
  
  // Generate random angle and distance
  const angle = Math.random() * 2 * Math.PI;
  const distance = Math.random() * radiusInDegrees;
  
  const latitude = centerLat + distance * Math.cos(angle);
  const longitude = centerLon + distance * Math.sin(angle);
  
  return {
    latitude: parseFloat(latitude.toFixed(6)),
    longitude: parseFloat(longitude.toFixed(6))
  };
}

/**
 * Calculate bounding box for a given center point and radius
 * @param {number} centerLat - Center latitude
 * @param {number} centerLon - Center longitude
 * @param {number} radiusInMeters - Radius in meters
 * @returns {Object} Bounding box {north, south, east, west}
 */
function calculateBoundingBox(centerLat, centerLon, radiusInMeters) {
  const R = 6371000; // Earth's radius in meters
  
  // Calculate angular distance
  const angularDistance = radiusInMeters / R;
  
  const lat = toRadians(centerLat);
  const lon = toRadians(centerLon);
  
  const latMin = lat - angularDistance;
  const latMax = lat + angularDistance;
  
  const deltaLon = Math.asin(Math.sin(angularDistance) / Math.cos(lat));
  const lonMin = lon - deltaLon;
  const lonMax = lon + deltaLon;
  
  return {
    north: toDegrees(latMax),
    south: toDegrees(latMin),
    east: toDegrees(lonMax),
    west: toDegrees(lonMin)
  };
}

/**
 * Check if a point is within a bounding box
 * @param {number} lat - Latitude to check
 * @param {number} lon - Longitude to check
 * @param {Object} boundingBox - Bounding box {north, south, east, west}
 * @returns {boolean} True if point is within bounding box
 */
function isWithinBoundingBox(lat, lon, boundingBox) {
  return (
    lat >= boundingBox.south &&
    lat <= boundingBox.north &&
    lon >= boundingBox.west &&
    lon <= boundingBox.east
  );
}

/**
 * Format distance for display
 * @param {number} distanceInMeters 
 * @returns {string} Formatted distance string
 */
function formatDistance(distanceInMeters) {
  if (distanceInMeters < 1000) {
    return `${Math.round(distanceInMeters)}m`;
  } else {
    return `${(distanceInMeters / 1000).toFixed(1)}km`;
  }
}

/**
 * Get cardinal direction from bearing
 * @param {number} bearing - Bearing in degrees
 * @returns {string} Cardinal direction (N, NE, E, SE, S, SW, W, NW)
 */
function getCardinalDirection(bearing) {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(bearing / 45) % 8;
  return directions[index];
}

module.exports = {
  calculateDistance,
  calculateBearing,
  findUsersInRadius,
  validateCoordinates,
  generateRandomCoordinatesInRadius,
  calculateBoundingBox,
  isWithinBoundingBox,
  formatDistance,
  getCardinalDirection,
  toRadians,
  toDegrees
};