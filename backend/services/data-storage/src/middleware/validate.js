/**
 * 验证中间件
 */
function validate(schema) {
  return (req, res, next) => {
    let data;

    // 根据请求方法选择要验证的数据来源
    if (req.method === 'GET' || req.method === 'DELETE') {
      data = req.query;
    } else {
      data = req.body;
    }

    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        type: detail.type
      }));

      return res.status(400).json({
        error: 'Validation Error',
        details
      });
    }

    // 将验证后的值存储在 req 中
    if (req.method === 'GET' || req.method === 'DELETE') {
      req.query = value;
    } else {
      req.body = value;
    }

    next();
  };
}

module.exports = validate;
