function composeControllers(controllers) {
  controllers = controllers.slice(0); // clone
  return (req, res, finalNext) => {
    function nextController() {
      const ctlr = controllers.shift();
      if (!ctlr) {
        return finalNext();
      }

      try {
        ctlr(req, res, nextController);
      }
      catch (err) {
        finalNext(err);
      }
    }

    nextController();
  };
}

module.exports = composeControllers;