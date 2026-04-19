const { getMySQLPool } = require('../utils/db');
const nodemailer = require('nodemailer');
const twilio = require('twilio');

/**
 * 获取所有告警规则
 */
async function getAlertRules(req, res, next) {
  try {
    const { deviceId, severity, enabled, limit, offset } = req.query;
    const pool = getMySQLPool();

    let query = `SELECT * FROM alert_rules WHERE 1=1`;
    const params = [];

    if (deviceId) {
      query += ' AND device_id = ?';
      params.push(deviceId);
    }

    if (severity) {
      query += ' AND severity = ?';
      params.push(severity);
    }

    if (enabled !== undefined) {
      query += ' AND enabled = ?';
      params.push(enabled);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [results] = await pool.execute(query, params);

    res.status(200).json({
      success: true,
      data: results.map(row => ({
        id: row.id,
        deviceId: row.device_id,
        ruleName: row.rule_name,
        conditionType: row.condition_type,
        conditionValue: JSON.parse(row.condition_value),
        severity: row.severity,
        enabled: row.enabled,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }))
    });
  } catch (error) {
    error.status = 400;
    next(error);
  }
}

/**
 * 创建告警规则
 */
async function createAlertRule(req, res, next) {
  try {
    const { deviceId, ruleName, conditionType, conditionValue, severity, enabled } = req.body;
    const pool = getMySQLPool();

    const [result] = await pool.execute(
      `INSERT INTO alert_rules (device_id, rule_name, condition_type, condition_value, severity, enabled) VALUES (?, ?, ?, ?, ?, ?)`,
      [deviceId, ruleName, conditionType, JSON.stringify(conditionValue), severity, enabled]
    );

    res.status(201).json({
      success: true,
      message: 'Alert rule created successfully',
      data: {
        id: result.insertId
      }
    });
  } catch (error) {
    error.status = 400;
    next(error);
  }
}

/**
 * 更新告警规则
 */
async function updateAlertRule(req, res, next) {
  try {
    const { id } = req.params;
    const { ruleName, conditionType, conditionValue, severity, enabled } = req.body;
    const pool = getMySQLPool();

    const updates = [];
    const params = [];

    if (ruleName !== undefined) {
      updates.push('rule_name = ?');
      params.push(ruleName);
    }

    if (conditionType !== undefined) {
      updates.push('condition_type = ?');
      params.push(conditionType);
    }

    if (conditionValue !== undefined) {
      updates.push('condition_value = ?');
      params.push(JSON.stringify(conditionValue));
    }

    if (severity !== undefined) {
      updates.push('severity = ?');
      params.push(severity);
    }

    if (enabled !== undefined) {
      updates.push('enabled = ?');
      params.push(enabled);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        details: 'No fields to update'
      });
    }

    params.push(id);

    await pool.execute(
      `UPDATE alert_rules SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    res.status(200).json({
      success: true,
      message: 'Alert rule updated successfully'
    });
  } catch (error) {
    error.status = 400;
    next(error);
  }
}

/**
 * 删除告警规则
 */
async function deleteAlertRule(req, res, next) {
  try {
    const { id } = req.params;
    const pool = getMySQLPool();

    await pool.execute('DELETE FROM alert_rules WHERE id = ?', [id]);

    res.status(200).json({
      success: true,
      message: 'Alert rule deleted successfully'
    });
  } catch (error) {
    error.status = 400;
    next(error);
  }
}

/**
 * 启用/禁用告警规则
 */
async function toggleAlertRule(req, res, next) {
  try {
    const { id } = req.params;
    const pool = getMySQLPool();

    const [rows] = await pool.execute('SELECT enabled FROM alert_rules WHERE id = ?', [id]);

    if (rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        details: 'Alert rule not found'
      });
    }

    const newEnabled = !rows[0].enabled;

    await pool.execute('UPDATE alert_rules SET enabled = ? WHERE id = ?', [newEnabled, id]);

    res.status(200).json({
      success: true,
      message: `Alert rule ${newEnabled ? 'enabled' : 'disabled'} successfully`,
      data: {
        enabled: newEnabled
      }
    });
  } catch (error) {
    error.status = 400;
    next(error);
  }
}

/**
 * 获取告警历史
 */
async function getAlertHistory(req, res, next) {
  try {
    const { deviceId, severity, startTime, endTime, limit, offset } = req.query;
    const pool = getMySQLPool();

    let query = `SELECT * FROM alert_history WHERE 1=1`;
    const params = [];

    if (deviceId) {
      query += ' AND device_id = ?';
      params.push(deviceId);
    }

    if (severity) {
      query += ' AND severity = ?';
      params.push(severity);
    }

    if (startTime) {
      query += ' AND triggered_at >= ?';
      params.push(startTime);
    }

    if (endTime) {
      query += ' AND triggered_at <= ?';
      params.push(endTime);
    }

    query += ' ORDER BY triggered_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [results] = await pool.execute(query, params);

    res.status(200).json({
      success: true,
      data: results.map(row => ({
        id: row.id,
        ruleId: row.rule_id,
        deviceId: row.device_id,
        alertType: row.alert_type,
        severity: row.severity,
        message: row.message,
        triggeredAt: row.triggered_at,
        resolvedAt: row.resolved_at,
        resolved: row.resolved
      }))
    });
  } catch (error) {
    error.status = 400;
    next(error);
  }
}

/**
 * 获取未处理的告警
 */
async function getUnresolvedAlerts(req, res, next) {
  try {
    const pool = getMySQLPool();

    const [results] = await pool.execute(
      `SELECT ah.*, ar.rule_name FROM alert_history ah
       JOIN alert_rules ar ON ah.rule_id = ar.id
       WHERE ah.resolved = false
       ORDER BY ah.triggered_at DESC
       LIMIT 100`
    );

    res.status(200).json({
      success: true,
      data: results.map(row => ({
        id: row.id,
        ruleId: row.rule_id,
        ruleName: row.rule_name,
        deviceId: row.device_id,
        alertType: row.alert_type,
        severity: row.severity,
        message: row.message,
        triggeredAt: row.triggered_at
      }))
    });
  } catch (error) {
    error.status = 400;
    next(error);
  }
}

/**
 * 处理告警
 */
async function resolveAlert(req, res, next) {
  try {
    const { id } = req.params;
    const pool = getMySQLPool();

    await pool.execute(
      'UPDATE alert_history SET resolved = true, resolved_at = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    );

    res.status(200).json({
      success: true,
      message: 'Alert resolved successfully'
    });
  } catch (error) {
    error.status = 400;
    next(error);
  }
}

/**
 * 创建通知配置
 */
async function createNotification(req, res, next) {
  try {
    const { alertRuleId, notificationType, recipient, enabled } = req.body;
    const pool = getMySQLPool();

    const [result] = await pool.execute(
      `INSERT INTO notification_configs (alert_rule_id, notification_type, recipient, enabled) VALUES (?, ?, ?, ?)`,
      [alertRuleId, notificationType, recipient, enabled]
    );

    res.status(201).json({
      success: true,
      message: 'Notification config created successfully',
      data: {
        id: result.insertId
      }
    });
  } catch (error) {
    error.status = 400;
    next(error);
  }
}

/**
 * 获取通知配置
 */
async function getNotifications(req, res, next) {
  try {
    const { alertRuleId, notificationType, enabled, limit, offset } = req.query;
    const pool = getMySQLPool();

    let query = `SELECT * FROM notification_configs WHERE 1=1`;
    const params = [];

    if (alertRuleId) {
      query += ' AND alert_rule_id = ?';
      params.push(alertRuleId);
    }

    if (notificationType) {
      query += ' AND notification_type = ?';
      params.push(notificationType);
    }

    if (enabled !== undefined) {
      query += ' AND enabled = ?';
      params.push(enabled);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [results] = await pool.execute(query, params);

    res.status(200).json({
      success: true,
      data: results.map(row => ({
        id: row.id,
        alertRuleId: row.alert_rule_id,
        notificationType: row.notification_type,
        recipient: row.recipient,
        enabled: row.enabled,
        createdAt: row.created_at
      }))
    });
  } catch (error) {
    error.status = 400;
    next(error);
  }
}

/**
 * 删除通知配置
 */
async function deleteNotification(req, res, next) {
  try {
    const { id } = req.params;
    const pool = getMySQLPool();

    await pool.execute('DELETE FROM notification_configs WHERE id = ?', [id]);

    res.status(200).json({
      success: true,
      message: 'Notification config deleted successfully'
    });
  } catch (error) {
    error.status = 400;
    next(error);
  }
}

/**
 * 启用/禁用通知配置
 */
async function toggleNotification(req, res, next) {
  try {
    const { id } = req.params;
    const pool = getMySQLPool();

    const [rows] = await pool.execute('SELECT enabled FROM notification_configs WHERE id = ?', [id]);

    if (rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        details: 'Notification config not found'
      });
    }

    const newEnabled = !rows[0].enabled;

    await pool.execute('UPDATE notification_configs SET enabled = ? WHERE id = ?', [newEnabled, id]);

    res.status(200).json({
      success: true,
      message: `Notification config ${newEnabled ? 'enabled' : 'disabled'} successfully`,
      data: {
        enabled: newEnabled
      }
    });
  } catch (error) {
    error.status = 400;
    next(error);
  }
}

/**
 * 测试通知
 */
async function testNotification(req, res, next) {
  try {
    const { notificationType, recipient, message } = req.body;

    let result;

    if (notificationType === 'email') {
      result = await sendEmail(recipient, message);
    } else if (notificationType === 'sms') {
      result = await sendSMS(recipient, message);
    }

    res.status(200).json({
      success: true,
      message: 'Test notification sent successfully',
      data: result
    });
  } catch (error) {
    error.status = 400;
    next(error);
  }
}

/**
 * 获取告警统计
 */
async function getAlertStats(req, res, next) {
  try {
    const { startTime, endTime } = req.query;
    const pool = getMySQLPool();

    const [results] = await pool.execute(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN severity = 'low' THEN 1 ELSE 0 END) as low_count,
        SUM(CASE WHEN severity = 'medium' THEN 1 ELSE 0 END) as medium_count,
        SUM(CASE WHEN severity = 'high' THEN 1 ELSE 0 END) as high_count,
        SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END) as critical_count,
        SUM(CASE WHEN resolved = true THEN 1 ELSE 0 END) as resolved_count,
        SUM(CASE WHEN resolved = false THEN 1 ELSE 0 END) as unresolved_count
      FROM alert_history
      WHERE triggered_at BETWEEN ? AND ?
    `, [startTime, endTime]);

    res.status(200).json({
      success: true,
      data: results[0]
    });
  } catch (error) {
    error.status = 400;
    next(error);
  }
}

/**
 * 内部函数：发送电子邮件
 */
async function sendEmail(to, message) {
  // 配置邮件发送器（需要真实使用时需要配置实际的SMTP服务器）
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'localhost',
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  const mailOptions = {
    from: process.env.SMTP_FROM || 'no-reply@smartconstruction.com',
    to: to,
    subject: 'Smart Construction IoT - Alert Notification',
    text: message
  };

  // 模拟发送（实际使用时取消注释并配置真实的SMTP
  // await transporter.sendMail(mailOptions);

  return {
    sent: true,
    to: to,
    type: 'email'
  };
}

/**
 * 内部函数：发送短信
 */
async function sendSMS(to, message) {
  // 配置Twilio客户端（需要真实的Twilio账户）
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

  // 模拟发送（实际使用时取消注释并配置真实的Twilio账户）
  // const client = twilio(accountSid, authToken);
  // await client.messages.create({
  //   body: message,
  //   from: twilioPhone,
  //   to: to
  // });

  return {
    sent: true,
    to: to,
    type: 'sms'
  };
}

module.exports = {
  getAlertRules,
  createAlertRule,
  updateAlertRule,
  deleteAlertRule,
  toggleAlertRule,
  getAlertHistory,
  getUnresolvedAlerts,
  resolveAlert,
  createNotification,
  getNotifications,
  deleteNotification,
  toggleNotification,
  testNotification,
  getAlertStats
};
