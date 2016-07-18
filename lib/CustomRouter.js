const composeControllers = require('./util/composeControllers');

function CustomRouter() {
  // This main controller will be wrapped with
  // each mounted controller
  var mainController = (req, res, next) => next();

  // The "router" is actually just middleware
  const router = (req, res, next) => mainController(req, res, next);

  router._mountController = (match, controller) => {
    // Accept an array of controllers
    const flatController = Array.isArray(controller) ?
      composeControllers(controller) : controller;

    // Wrap the controller, to delegate requests which match the client's fn
    const wrappedController = (req, res, next) => {
      if (match(req)) {
        try {
          return flatController(req, res, next);
        }
        catch (err) {
          return next(err);
        }
      }
      next();
    };

    // Override the mainController,
    // adding the new controller to the bottom of the stack
    mainController = composeControllers([
      mainController,
      wrappedController
    ]);
  };

  router._mountControllerForMethod = (method, match, controller) => router._mountController(
    req => (
      req.method.toLowerCase() === method.toLowerCase() &&
      match(req)
    ),
    controller
  );


  router.all = (match, controller) => router._mountController(match, controller);
  router.use = (middleware) => router._mountController(() => true, middleware);

  router.get = (match, controller) => router._mountControllerForMethod('GET', match, controller);
  router.post = (match, controller) => router._mountControllerForMethod('POST', match, controller);
  router.put = (match, controller) => router._mountControllerForMethod('PUT', match, controller);
  router.delete = (match, controller) => router._mountControllerForMethod('DELETE', match, controller);

  return router;
}

module.exports = CustomRouter;