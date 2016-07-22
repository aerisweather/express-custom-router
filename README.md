# express-custom-router

Custom routing rules for [express.js](https://expressjs.com/).

## Installation

```
npm install --save express-custom-router
```

## Usage

`express-custom-router` differs from the standard Express router, in that accepts a `match` function in place of a route path. The mounted controller will only be called if the `match` function returns true.

This allows much more flexibility in route handling.

```js
const express = require('express');
const CustomRouter = require('express-custom-router');

const app = express();
const router = CustomRouter();

// Define routing rules for a controller
router.get(
    // Matching function receives the request,
    // and returns true/false
	req => (
	  req.url.startsWith('/foo') &&
	  req.method === 'GET' &&
	  req.headers['x-my-request-header'] = 'quux'
	),
	// Controller
	(req, res, next) => res.send('foo')
);

// Mount the router
app.use(router);
```

## Why?

I am working on an application with very complicated route, which can accept all sorts of different options, in all sorts of different formats. Relying on Express' routing syntax makes handling these route very difficult. 

With `express-custom-router`, I can parse the url however I want to, and then route based on this parsed route.

For example:

```js
const app = express();
const router = CustomRouter();

// Middleware for manually parsing
// request parameters
router.use((req, res, next) => {
  req.opts = manuallyParseMyUrl(req.originalUrl);
  next();
});

// Setup routes, based on my manually parsed params
router.get(
  req => req.opts.foo === 'bar',
  (req, res) => res.send('foo is bar')
);
router.get(
  req => req.opts.foo === 'quux',
  (req, res) => res.send('foo is quux')
);
```

## Reference

### CustomRouter#all(match, controller)

Mount a controller for any HTTP verb

### CustomRouter#get(match, controller)

Mount a controller for `GET` requests

### CustomRouter#post(match, controller)

Mount a controller for `POST` requests

### CustomRouter#put(match, controller)

Mount a controller for `PUT` requests

### CustomRouter#delete(match, controller)

Mount a controller for `DELETE` requests

### CustomRouter#use(middleware)

Mount middleware for all requests. Middleware must use the format `(req, res, next) => {}`
