const CustomRouter = require('../../lib/CustomRouter');
const assert = require('assert');
const request = require('supertest');
const express = require('express');
const sinon = require('sinon');
const http = require('http');

describe('CustomRouter', function() {
  var app, router;

  beforeEach(() => {
    app = express();
    router = CustomRouter();

    app.use(router);
  });

  function ControllerSpy(fn) {
    fn || (fn = (req, res, next) => next());

    return sinon.spy(fn);
  }

  describe('all', function() {

    it('should only use a controller, if `match() = true`', (done) => {
      const matchingController = sinon.spy();
      const notMatchingController = sinon.spy();

      router.all(() => false, notMatchingController);
      router.all(() => true, (req, res, next) => {
        matchingController();
        res.send();
      });

      request(app)
        .get('/')
        .expect(200)
        .expect(res => {
          assert.strictEqual(notMatchingController.called, false, 'did not call when match() = false');
          assert.strictEqual(matchingController.called, true, 'called when match() = true');
        })
        .end(done);
    });

    it('should pass the request to `match()`', (done) => {
      const match = sinon.spy((req) => {
        assert(req instanceof http.IncomingMessage);
        return true;
      });
      router.all(match, (req, res) => res.send());

      request(app)
        .get('/')
        .expect(200)
        .expect(() => {
          assert(match.called, 'match was called');
        })
        .end(done)
    });

    it('should call `next`, if no controllers match', (done) => {
      router.all(() => false, (req, res, next) => next());

      const finalController = sinon.spy((req, res, next) => res.send());
      app.use(finalController);

      request(app)
        .get('/')
        .expect(200)
        .expect(() => {
          assert(finalController.called, 'final controller was called');
        })
        .end(done)
    });

    it('should call `next(err)` if `match()` throws an error', (done) => {
      const controller = sinon.spy((req, res) => res.send());
      const onError = sinon.spy();

      router.all(() => {
        throw new Error('match error');
      }, controller);

      app.use((err, req, res, next) => {
        assert.strictEqual(err.message, 'match error', 'should receive error from match()');
        onError();
        res.send();
      });

      request(app)
        .get('/')
        .expect(() => {
          assert.strictEqual(controller.called, false, 'should not have called the controller');
          assert.strictEqual(onError.called, true, 'should have called error handler');
        })
        .expect(200)
        .end(done);
    });

    it('should end the request chain, if a controller throws an error', (done) => {
      const controllerA = sinon.spy(() => {
        throw new Error();
      });
      const controllerB = sinon.spy((req, res) => res.send());

      router.all(() => true, controllerA);
      router.all(() => true, controllerB);

      request(app)
        .get('/')
        .expect(() => {
          assert(controllerA.called, 'should call first');
          assert.strictEqual(controllerB.called, false, 'should not call second controller');
        })
        .expect(500)
        .end(done);
    });

    it('should end the request chain, if a controller calls `next(error)`', (done) => {
      const controllerA = sinon.spy((req, res, next) => {
        next(new Error());
      });
      const controllerB = sinon.spy((req, res) => res.send());

      router.all(() => true, controllerA);
      router.all(() => true, controllerB);

      request(app)
        .get('/')
        .expect(() => {
          assert(controllerA.called, 'should call first');
          assert.strictEqual(controllerB.called, false, 'should not call second controller');
        })
        .expect(500)
        .end(done);
    });

    it('should pass errors to the app-level error handler', (done) => {
      const controller = sinon.spy((req, res, next) => next(new Error()));
      const onError = sinon.spy();

      router.get(() => true, controller);
      app.use((err, req, res, next) => {
        assert(err instanceof Error, 'should have received an error');
        onError();
        res.send();
      });

      request(app)
        .get('/')
        .expect(() => {
          assert(controller.called, 'should have called controller');
          assert(onError.called, 'should have called error handler');
        })
        .end(done);
    });

    it('should accept a chain of controllers, mounted together', (done) => {
      const controllerA = sinon.spy((req, res, next) => next());
      const controllerB = sinon.spy((req, res, next) => {
        assert(controllerA.called, 'controllerA was called');
        // modifiy req
        req.foo = 'bar';
        next();
      });
      const controllerC = sinon.spy((req, res, next) => {
        assert(controllerB.called, 'controllerB was called');
        assert.strictEqual(req.foo, 'bar', 'received modified request');
        res.send();
      });

      router.all(() => true, [controllerA, controllerB, controllerC]);

      request(app)
        .get('/')
        .expect(200)
        .expect(() => {
          assert(controllerC.called, 'controllerC was called');
        })
        .end(done);
    });

    it('should accept multiple controllers, mounted sequentially', (done) => {
      const controllerA = sinon.spy((req, res, next) => next());
      const controllerB = sinon.spy((req, res, next) => {
        assert(controllerA.called, 'controllerA was called');
        // modifiy req
        req.foo = 'bar';
        next();
      });
      const controllerC = sinon.spy((req, res, next) => {
        assert(controllerB.called, 'controllerB was called');
        assert.strictEqual(req.foo, 'bar', 'received modified request');
        res.send();
      });

      router.all(() => true, controllerA);
      router.all(() => true, controllerB);
      router.all(() => true, controllerC);

      request(app)
        .get('/')
        .expect(200)
        .expect(() => {
          assert(controllerC.called, 'controllerC was called');
        })
        .end(done);
    });

  });

  describe('get', function() {

    it('should accept GET requests', (done) => {
      const onGet = sinon.spy();
      router.get(() => true, (req, res) => {
        onGet();
        res.send();
      });

      request(app)
        .get('/')
        .expect(200)
        .expect(() => assert(onGet.called, 'controller was called'))
        .end(done);
    });

    it('should not accept non-GET requests', (done) => {
      const onGet = sinon.spy();
      router.get(() => true, (req, res) => {
        onGet();
        res.send();
      });

      request(app)
        .post('/')
        .expect(() => assert(!onGet.called, 'controller was not called'))
        .end(done);
    });

  });

  describe('post', function() {

    it('should accept POST requests', (done) => {
      const onPost = sinon.spy();
      router.post((req, res, next) => true, (req, res) => {
        onPost();
        res.send();
      });

      request(app)
        .post('/')
        .expect(200)
        .expect(() => assert(onPost.called, 'controller was called'))
        .end(done);
    });

    it('should not accept non-POST requests', (done) => {
      const onGet = sinon.spy();
      router.post(() => true, (req, res) => {
        onGet();
        res.send();
      });

      request(app)
        .get('/')
        .expect(() => assert(!onGet.called, 'controller was not called'))
        .end(done);
    });

  });

  describe('put', function() {

    it('should accept PUT requests', (done) => {
      const onPut = sinon.spy();
      router.put((req, res, next) => true, (req, res) => {
        onPut();
        res.send();
      });

      request(app)
        .put('/')
        .expect(200)
        .expect(() => assert(onPut.called, 'controller was called'))
        .end(done);
    });

    it('should not accept non-PUT requests', (done) => {
      const onPut = sinon.spy();
      router.put(() => true, (req, res) => {
        onPut();
        res.send();
      });

      request(app)
        .get('/')
        .expect(() => assert(!onPut.called, 'controller was not called'))
        .end(done);
    });

  });

  describe('delete', function() {

    it('should accept DELETE requests', (done) => {
      const onDelete = sinon.spy();
      router.delete((req, res, next) => true, (req, res) => {
        onDelete();
        res.send();
      });

      request(app)
        .delete('/')
        .expect(200)
        .expect(() => assert(onDelete.called, 'controller was called'))
        .end(done);
    });

    it('should not accept non-PUT requests', (done) => {
      const onDelete = sinon.spy();
      router.delete(() => true, (req, res) => {
        onDelete();
        res.send();
      });

      request(app)
        .get('/')
        .expect(() => assert(!onDelete.called, 'controller was not called'))
        .end(done);
    });

  });

  describe('use', function() {

    it('should invoke the middleware for all requests', (done) => {
      const middleware = sinon.spy((req, res, next) => {
        next();
      });

      router.use(middleware);

      request(app)
        .get('/')
        .expect(() => assert(middleware.called, 'should have called middleware'))
        .end(done);
    });

    it('should accept an array of middleware', (done) => {
      const middlewareA = sinon.spy((req, res, next) => next());
      const middlewareB = sinon.spy((req, res, next) => {
        assert(middlewareA.called, 'should have called middlewareA, first');
        res.send();
      });

      router.use([middlewareA, middlewareB]);

      request(app)
        .get('/')
        .expect(() => assert(middlewareB.called, 'should have called middlewareB'))
        .end(done);
    });

    it('should not invoke the middleware, if a previous controller throws an error', (done) => {
      const controller = sinon.spy((req, res, next) => {
        next(new Error('test error'));
      });
      const middleware = sinon.spy();

      router.all(() => true, controller);
      router.use(middleware);

      request(app)
        .get('/')
        .expect(() => {
          assert(controller.called, 'should have called controller');
          assert.strictEqual(middleware.called, false, 'should not have called middleware');
        })
        .expect(500)
        .end(done);
    });

    it('should act as an error handler, if an error argument is included', (done) => {
      const controller = sinon.spy((req, res, next) => {
        next(new Error('test error'));
      });
      const onError = sinon.spy();

      router.all(() => true, controller);
      router.use((err, req, res, next) => {
        assert(err instanceof Error, 'received error');
        assert.strictEqual(err.message, 'test error', 'error message');
        onError();
        res.send();
      });

      request(app)
        .get('/')
        .expect(() => {
          assert(controller.called, 'should have called controller');
          assert(onError.called, 'should have called error handler');
        })
        .expect(200)
        .end(done);
    });

  });

});