const { Pool } = require('pg');
const pool = require('../config/database');

class User {
  static async findByEmail(email) {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0];
  }

  static async findById(id) {
    const result = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0];
  }

  static async create(userData) {
    const { email, password, name } = userData;
    const result = await pool.query(
      `INSERT INTO users (email, password, name, created_at) 
       VALUES ($1, $2, $3, NOW()) 
       RETURNING id, email, name, github_connected, github_username`,
      [email, password, name]
    );
    return result.rows[0];
  }

  static async updateGitHubInfo(userId, githubData) {
    const { github_id, github_username, github_token } = githubData;
    const result = await pool.query(
      `UPDATE users 
       SET github_id = $1, github_username = $2, github_token = $3, 
           github_connected = true, updated_at = NOW()
       WHERE id = $4 
       RETURNING id, email, name, github_username, github_connected`,
      [github_id, github_username, github_token, userId]
    );
    return result.rows[0];
  }

  static async disconnectGitHub(userId) {
    const result = await pool.query(
      `UPDATE users 
       SET github_id = NULL, github_username = NULL, github_token = NULL,
           github_connected = false, updated_at = NOW()
       WHERE id = $1 
       RETURNING id, email, name, github_connected`,
      [userId]
    );
    return result.rows[0];
  }

  static async findByGitHubId(githubId) {
    const result = await pool.query(
      'SELECT * FROM users WHERE github_id = $1',
      [githubId]
    );
    return result.rows[0];
  }
}

module.exports = User;