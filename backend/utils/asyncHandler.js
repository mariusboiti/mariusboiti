/**
 * Wraps an async Express route handler so that any thrown error is forwarded
 * to the next() error middleware instead of becoming an unhandled rejection.
 *
 * Usage:
 *   router.get("/path", asyncHandler(async (req, res) => { ... }));
 *
 * @param {(req, res, next) => Promise<void>} fn
 * @returns {(req, res, next) => void}
 */
function asyncHandler(fn) {
  return function asyncRouteWrapper(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = { asyncHandler };
