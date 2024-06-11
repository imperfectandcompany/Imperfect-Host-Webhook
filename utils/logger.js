function logWithTraceId(traceId, message) {
  console.log(`[${new Date().toISOString()}][${traceId}]: ${message}`);
}

module.exports = {
  logWithTraceId
};
