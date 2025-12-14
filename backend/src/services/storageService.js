const fs = require('fs').promises;
const path = require('path');
const config = require('../config');

/**
 * Storage service for managing uploaded files
 */
class StorageService {
  /**
   * Delete a file from storage
   */
  async deleteFile(filePath) {
    try {
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      if (error.code === 'ENOENT') {
        // File doesn't exist, consider it deleted
        return true;
      }
      throw error;
    }
  }

  /**
   * Check if a file exists
   */
  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get file stats
   */
  async getFileStats(filePath) {
    try {
      const stats = await fs.stat(filePath);
      return {
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
      };
    } catch {
      return null;
    }
  }

  /**
   * Ensure directory exists
   */
  async ensureDir(dirPath) {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }

  /**
   * Get the full path for an ad file
   */
  getAdPath(filename) {
    return path.join(config.adsDir, filename);
  }

  /**
   * Get the full path for a reaction file
   */
  getReactionPath(filename) {
    return path.join(config.reactionsDir, filename);
  }

  /**
   * Get the full path for an export file
   */
  getExportPath(filename) {
    return path.join(config.exportsDir, filename);
  }

  /**
   * Clean up orphaned files (files not in database)
   * This would be called periodically or on admin request
   */
  async cleanupOrphanedFiles(db, directory, table, filenameColumn = 'filename') {
    const files = await fs.readdir(directory);
    const result = await db.query(`SELECT ${filenameColumn} FROM ${table}`);
    const dbFilenames = new Set(result.rows.map(r => r[filenameColumn]));

    const orphaned = [];
    for (const file of files) {
      if (file === '.gitkeep') continue;
      if (!dbFilenames.has(file)) {
        await this.deleteFile(path.join(directory, file));
        orphaned.push(file);
      }
    }

    return orphaned;
  }
}

module.exports = new StorageService();
