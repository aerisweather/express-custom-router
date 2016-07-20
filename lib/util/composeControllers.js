function composeControllers(controllers) {
  return (req, res, finalNext) => {
    const reqControllers = controllers.slice(0); // clone

    function nextController() {
      const ctlr = reqControllers.shift();
      if (!ctlr) {
        return finalNext();
      }

      try {
        ctlr(req, res, (err) => {
          if (err) { return finalNext(err); }
          nextController();
        });
      }
      catch (err) {
        finalNext(err);
      }
    }

    nextController();
  };
}

module.exports = composeControllers;